# Spec — Frontend do dashboard (VAVA Stats)

> Status: **proposta, com as decisões tomadas** (21/10/2026) · Consome a API da [spec do backend](../backend/spec.md), já implementada.
> Plano em [plan.md](plan.md) e tarefas em [tasks.md](tasks.md).
> Decisões F1–F17 na seção 12, cada uma com o motivo e as seções que ela afeta.

## 1. Objetivo

Trocar o app atual do `vava/` (um explorador que lê JSONs arrastados para a página) por um dashboard com a
navegação e o visual do [csstats.gg](https://csstats.gg/pt-BR), alimentado **só pela API** `/api`.

Restrições, as mesmas do backend:

- **Velocidade acima de tudo**: sem TypeScript, sem gerenciador de estado, sem biblioteca de fetch, sem
  framework de CSS. React + Vite, como já está no `vava/`.
- **Arquitetura simples**: a URL é o estado; cada página busca o que precisa; um cache em memória por URL.
- **Extensível**: uma análise nova no backend aparece no dashboard **sem mudar o front** (seção 8).

Todos os números já chegam calculados. O front só formata, colore e desenha: não recalcula métrica nenhuma.

## 2. Referência: o que copiar do csstats.gg

O csstats bloqueia acesso automatizado (HTTP 403), então esta spec usa o mapeamento de páginas da spec do
backend (§2) e os padrões abaixo. Sugestão: antes de começar, alguém do time salva prints da Home, do
Leaderboards, de uma partida e de um perfil em `docs/frontend/referencia/`.

Padrões do csstats que vamos reproduzir:

| Padrão | Onde aparece no VAVA Stats |
|---|---|
| Tema escuro e denso, com tabelas como elemento principal | todas as páginas |
| Navbar fixa com a busca sempre visível | shell (6.1) |
| Números coloridos por qualidade (verde bom, vermelho fraco) | tabelas e tiles (6.3) |
| Cabeçalho da entidade com tiles grandes de estatística | Jogador, Time, Partida |
| Abas dentro de cada entidade | Jogador, Time, Partida, Ranking |
| Histograma de distribuição acima do leaderboard | Ranking |
| Abas de mapa no leaderboard | Ranking (chips de mapa) |
| Barra de histórico de rounds com ícone do resultado | Partida |
| Cards de mapa com a imagem do mapa ao fundo | Jogador › Mapas, Mapas |

Do csstats para as nossas rotas:

| csstats.gg | VAVA Stats | Rota | Endpoints |
|---|---|---|---|
| Home | Home | `/` | `/resumo`, `/busca` |
| Leaderboards | Ranking | `/ranking`, `/ranking/times` | `/jogadores`, `/jogadores/distribuicao`, `/times` |
| All Matches | Partidas | `/partidas` | `/partidas` |
| Match | Partida | `/partidas/:id/...` | `/partidas/{id}`, `/rounds`, `/abates`, `/duelos` |
| Player | Jogador | `/jogadores/:puuid/...` | `/jogadores/{puuid}`, `/jogadores/{puuid}/partidas`, `/heatmap` |
| — | Time | `/times/:id/...` | `/times/{id}`, `/times/{id}/partidas`, `/heatmap` |
| Ban Stats / Tools | Análises | `/analises`, `/analises/:id` | `/analises`, `/analises/{id}` |
| — | Mapas | `/mapas`, `/mapas/:mapa` | `/heatmap`, `/analises/{id}?mapa=`, `/jogadores?mapa=` |

## 3. Escopo e prioridades

**Dentro:** as páginas da seção 7, a busca, os filtros comuns, o renderizador genérico de análises, os
heatmaps e o grafo de duelos.

**Fora:** login, escrita de dados, upload de arquivos, deploy, modo claro, outros idiomas (tudo em pt-BR),
SSR, testes automatizados de interface.

| Prioridade | O quê | Por quê |
|---|---|---|
| **P0** (demo mínima) | Shell (navbar, busca, 404, aviso de backend fora do ar), Home, Ranking de jogadores, Partidas, Partida › Placar e Rounds, Jogador › Resumo e Partidas, Análises (lista por categoria e tela cheia, destino dos KPIs da Home) | O caminho da demo: Home → busca → jogador → partida → análises |
| **P1** | Ranking de times, distribuição, Partida › Heatmap e Duelos, Jogador › Agentes, Mapas, Armas e Heatmap, página do Time, "ver dados" na análise em tela cheia, Mapas, ícones de agentes e armas baixados (F4) | Completa o csstats e usa o resto da API |
| **P2** (se sobrar tempo) | Multisseleção nos filtros, séries (MD3) agrupadas, modo "pontos" no heatmap, exportar CSV | Acabamento |

## 4. Arquitetura

```
URL (rota + query) ──► useFiltros() ──► useApi(caminho, params) ──► fetch /api/... ──► proxy do Vite ──► FastAPI :8000
                                              │
                                              └── cache em memória (Map por URL) ──► componentes
```

| Tema | Decisão | Motivo |
|---|---|---|
| Base | React 19 + Vite 8 + JavaScript + oxlint, o que já existe no `vava/` | Nada a configurar |
| Rotas | `react-router` 8 (modo biblioteca: `createBrowserRouter` + `RouterProvider` + rotas aninhadas com `<Outlet/>`). Sem *loaders* | Abas como rotas (`/jogadores/:puuid/partidas`), links compartilháveis e o botão voltar funcionando |
| Estado | **A URL é o estado**: filtros, aba e ordenação ficam na rota e na query string. `useState` só para UI efêmera (hover, round selecionado) | F5, voltar e compartilhar link funcionam sem código extra |
| Dados | Hook próprio `useApi` (5.1), sem React Query/SWR | Os dados não mudam enquanto o backend roda, então o cache não precisa de invalidação: ~30 linhas resolvem |
| Gráficos | `recharts` para barras, linha, dispersão e histograma; a matriz é um grid em CSS | Componentes React declarativos; o mais rápido de usar |
| Heatmap | `HeatmapCanvas.jsx` atual, reaproveitado | Já funciona com pontos em `[0,1]`, que é o que a API devolve |
| Grafo de duelos | `react-force-graph-2d` (já instalado), com `MatchGraph.jsx` adaptado ao `/duelos` | A lógica de contagem saiu do front e foi para o backend |
| Ícones | `lucide-react` | Ícones de round (caveira, alicate, bomba, relógio), busca, setas |
| CSS | CSS global com variáveis (`index.css`) e um `.css` por componente, classes no estilo BEM, como o `vava/` já faz | Sem setup novo |
| Fonte | Inter servida localmente (`@fontsource-variable/inter`) | Mesmo visual em qualquer máquina, sem internet (F9) |

Dependências novas: `npm install react-router@8 recharts@3 lucide-react@1 @fontsource-variable/inter@5`. Elas
foram instaladas juntas com o React 19.3.1 do `vava/` numa pasta de teste (F8); o `package-lock.json` fixa as
versões.

### 4.1 Estrutura de pastas

```
vava/
├── index.html               # lang="pt-BR", título "VAVA Stats"
├── vite.config.js           # já tem o proxy /api → :8000
├── public/maps/<mapa>.png   # minimapas (já existem), nome do mapa em minúsculas
└── src/
    ├── main.jsx             # cria o router com todas as rotas (seção 7)
    ├── App.jsx              # layout: Navbar + <Outlet/> + rodapé + aviso de backend fora do ar
    ├── api.js               # urlApi(), useApi() e o cache
    ├── filtros.js           # useFiltros(): filtros comuns ⇄ query string
    ├── formatos.js          # dado da API → texto, cor ou link: números, datas, nick#tag, rótulos, cor por limiar, links
    ├── constants.js         # (existe) imagens dos mapas + ícones de round, cerimônias, cores
    ├── components/          # peças reutilizáveis (seção 6.4)
    ├── graficos/            # GraficoAnalise + um arquivo por tipo de gráfico (seção 8)
    └── pages/
        ├── Home.jsx, Ranking.jsx, Partidas.jsx, Analises.jsx, Analise.jsx, Mapas.jsx, Mapa.jsx, NaoEncontrado.jsx
        ├── partida/         # Partida.jsx (cabeçalho + abas) + Placar, Rounds, Heatmap, Duelos
        ├── jogador/         # Jogador.jsx + Resumo, Partidas, Agentes, Mapas, Armas, Heatmap
        └── time/            # Time.jsx + VisaoGeral, Elenco, Mapas, Partidas, Confrontos, Heatmap
```

Regra de organização: **páginas buscam dados; componentes só recebem props.** Assim um componente
(`Tabela`, `MapaCalor`, `LinhaPartida`) serve a várias páginas sem saber de onde veio o dado.

### 4.2 O que acontece com o `vava/` atual

| Arquivo | Destino |
|---|---|
| `HeatmapCanvas.jsx` | **Fica**: recebe `points` em `[0,1]`. Só a função de cor muda, trocando o arco-íris pela rampa da F14 |
| `MatchGraph.jsx` | **Vira** `components/GrafoDuelos.jsx`: lê `nos`/`arestas` do `/duelos` em vez do JSON bruto; cores por time A/B |
| `HeatmapView.jsx` | **Sai** na limpeza, porque usa o `extractKillData`. O markup e o CSS do mapa são a base do `components/MapaCalor.jsx` (imagem + canvas + contador); os controles sobem para as páginas |
| `constants.js` | **Fica** (`MAP_IMAGES`) e ganha os ícones de round, o `CORES_SERIE` (8) e a rampa do heatmap (9) |
| `index.css` | **Fica** como base visual, com os tokens estendidos (6.2) |
| `App.css` | **É reescrito** para o layout novo: todo o conteúdo atual é do layout antigo. As regras do mapa (`.heatmap-map-*`, `.heatmap-canvas`) vão para `MapaCalor.css` |
| `DropZone.jsx`, `Sidebar.jsx`, `MatchCard.jsx`, `App.jsx` atual | **Saem**: o backend lê `data/` (ver F7) |
| `utils.js` (`parseFilename`, `extractKillData`, `readFileAsJSON`) | **Sai**: a API entrega partidas, abates e coordenadas prontos |
| `assets/maps/calibration.json` | **Sai**: a calibração vive em `reference/` e é aplicada no backend (plano do backend, §2) |
| `src/assets/` (hero, logos do template) | **Sai** |

## 5. Consumo da API

### 5.1 Cliente (`api.js`)

```js
const cache = new Map() // url → Promise com o JSON; os dados não mudam enquanto o backend roda

// Monta /api/<caminho>?a=1&mapa=Ascent&mapa=Haven: arrays viram parâmetros repetidos e
// valores vazios (null, undefined, "", []) são omitidos, para a URL de cache ser estável.
export function urlApi(caminho, params = {}) { … }

// { dados, erro, carregando }. Com caminho null não busca (útil quando depende de outro dado).
// erro = { status, mensagem }: 404 → página "não encontrado"; 502/503/504 ou falha de rede → backend fora do ar.
export function useApi(caminho, params) { … }
```

- Resultado que chega depois de o componente desmontar ou de os parâmetros mudarem é descartado. A requisição
  não é abortada: ela fica no cache e serve à próxima visita (plano, seção 2).
- Resposta com erro **não** fica no cache: tentar de novo funciona.
- Chamadas em sequência para a mesma URL compartilham a mesma `Promise` (sem requisição duplicada).
- `App.jsx` chama `/api/saude` uma vez. Se falhar, mostra no topo: *"Backend fora do ar. Rode
  `.venv/bin/uvicorn app.main:app --reload --app-dir backend --port 8000` na raiz do repositório."* Só esse
  aviso usa o `/saude` (F10). Com o backend desligado, o proxy do Vite responde 502 com o corpo vazio.

### 5.2 Filtros comuns (`filtros.js`)

Os filtros usam **os mesmos nomes da API** (`torneio`, `fase`, `mapa`, `time`, `agente`, `funcao`) na query
string da página e são repassados sem tradução: `/ranking?mapa=Ascent` chama `/api/jogadores?mapa=Ascent`.

```js
const { filtros, setFiltro, limpar } = useFiltros()   // filtros = { torneio: ["Univavá"], mapa: [] … }
```

- As opções vêm de `/api/filtros`, buscado uma vez e guardado no cache: 4 torneios, 10 mapas, 68 times,
  28 agentes, 4 funções.
- **Fase depende do torneio**: com um torneio escolhido, o select de fase mostra só `torneios[].fases`. As fases
  da Univavá são Classificatória 1 a 4 e Fase de Grupos; os outros torneios têm uma fase com o mesmo nome.
- Na v1, **um valor por filtro** (select simples). A API já aceita vários; a multisseleção é P2 (F5).
- Trocar um filtro volta a paginação local para o início e preserva a aba.

A `BarraFiltros` recebe quais filtros mostrar. Cada endpoint ignora filtros de colunas que não tem, então a
página só mostra os que mudam o resultado:

| Página | Filtros visíveis | Parâmetros extras na URL |
|---|---|---|
| Ranking › Jogadores | torneio, fase, mapa, time, agente, funcao | `ordenar`, `ordem`, `min_rounds`, `limite` |
| Ranking › Times | torneio, fase, mapa | `min_partidas` |
| Partidas | torneio, fase, mapa, time | — |
| Análises | todos | `categoria` |
| Mapa (heatmap) | torneio, fase, time, agente, funcao | `tipo`, `lado` |
| Time › Partidas | torneio, fase, mapa | — |
| Jogador e Time › Heatmap | torneio, fase | `mapa`, `tipo`, `lado` |

### 5.3 Quem aceita filtro

Os perfis **não** aceitam filtros na API atual: os números de jogador, time e partida são sempre de todos os
torneios. Essas páginas não mostram a `BarraFiltros`, exceto nas abas que usam endpoints filtráveis.

| Aceita filtros comuns | Não aceita |
|---|---|
| `/jogadores`, `/jogadores/distribuicao`, `/times`, `/times/{id}/partidas`, `/partidas`, `/analises/{id}`, `/heatmap` | `/resumo`, `/busca`, `/jogadores/{puuid}`, `/jogadores/{puuid}/partidas`, `/times/{id}`, `/partidas/{id}/*` |

Aceitar filtros nos perfis é uma mudança pequena no backend, listada na seção 11.

### 5.4 Formatação (`formatos.js`)

A API devolve floats com 2 casas e nomes em `snake_case`. O front formata pelo **nome da coluna**, o que
também serve ao renderizador genérico de análises (seção 8):

| Colunas | Formato | Exemplo |
|---|---|---|
| `acs`, `adr` | inteiro | 231 |
| `kd`, `kpr`, `dpr`, `apr`, `fk_round`, `fd_round`, `r` | 2 casas | 1,31 |
| `media_vitoria`, `media_derrota` | 1 casa | 79,4 |
| com `pct` no nome (`win_pct`, `pct`, `pct_do_mapa`, `win_pct_quem_abriu`…) e `pick_rate` | 1 casa + `%` | 74,2% |
| `mais_menos`, `saldo_rounds` | sinal explícito | +37 / −3 |
| `loadout_*`, `vantagem_media` | milhar | 4.100 |
| `inicio`, `fim` (histograma) | inteiro | 197 |
| `data` | `dd/mm/aaaa` (em listas compactas, `dd/mm`) | 27/09/2026 |
| `duracao_min` | minutos | 22 min |
| `tempo_s` | `m:ss` | 1:04 |
| `nick` | nome em destaque + `#tag` apagado | **TORONTO**#lulu |
| demais números | `Intl.NumberFormat("pt-BR")` | 17.428 |

Os rótulos de coluna vêm do dicionário `ROTULOS` em `formatos.js` (F17). Ele cobre todas as colunas que a
API devolvia em 21/10/2026:

```js
export const ROTULOS = {
  // ranking e placar
  posicao: "#", nick: "Jogador", time: "Time", nome: "Time", adversario: "Adversário",
  agente: "Agente", agente_principal: "Agente", funcao: "Função", funcao_principal: "Função",
  partidas: "Partidas", vitorias: "Vitórias", derrotas: "Derrotas", win_pct: "Win%", rounds: "Rounds",
  kills: "K", deaths: "D", assists: "A", mais_menos: "+/−", acs: "ACS", adr: "ADR", kd: "K/D",
  kast_pct: "KAST", hs_pct: "HS%", kpr: "KPR", dpr: "DPR", apr: "APR", fk_round: "FK/R", fd_round: "FD/R",
  first_kills: "FK", first_deaths: "FD", multikills: "MK", posicao_ranking: "Ranking",
  // times
  rounds_ganhos: "Rounds ganhos", rounds_perdidos: "Rounds perdidos", saldo_rounds: "Saldo",
  atk_win_pct: "Win% ATK", def_win_pct: "Win% DEF", pistol_win_pct: "Win% pistol",
  atk_rounds: "Rounds ATK", def_rounds: "Rounds DEF", pistols: "Pistols", agentes: "Composição", compra: "Compra",
  // partidas, rounds e abates
  data: "Data", torneio: "Torneio", fase: "Fase", codigo: "Jogo", mapa: "Mapa", duracao_min: "Duração",
  n_rounds: "Rounds", placar_time: "Placar", placar_adversario: "Placar adv.", venceu: "Resultado",
  round: "Round", metade: "Metade", resultado: "Resultado", ceremonia: "Cerimônia", lado_vencedor: "Lado vencedor",
  houve_plant: "Plant", plant_site: "Site", houve_defuse: "Defuse", compra_atk: "Compra ATK", compra_def: "Compra DEF",
  loadout_atk: "Loadout ATK", loadout_def: "Loadout DEF", tempo_s: "Tempo", meio: "Arma", categoria_meio: "Categoria",
  assistencias: "Assist.", pct: "%",
  // análises e distribuição
  escolhas: "Escolhas", pick_rate: "Pick rate", partidas_mapa: "Partidas no mapa", pct_do_mapa: "% do mapa",
  plants: "Plants", faixa: "Faixa", vantagem_media: "Vantagem média", conversao_pct: "Conversão",
  quem_abriu: "Quem abriu", win_pct_quem_abriu: "Win% de quem abriu", metrica: "Métrica", r: "Correlação (r)",
  media_vitoria: "Média na vitória", media_derrota: "Média na derrota", inicio: "De", fim: "Até",
  jogadores: "Jogadores", pct_acumulado: "% acumulado", total: "Total",
}
```

- Coluna fora do dicionário vira texto legível automaticamente (`nova_coluna` → "Nova coluna").
- Os **valores** da coluna `metrica` (análise `metricas-vitoria`) também passam pelo `ROTULOS`: `kast_pct` → "KAST".

Valores de enum que a API devolve em inglês e o front traduz ou transforma em ícone:

| Campo | Valores → exibição |
|---|---|
| `resultado` (round) | `Eliminated` → caveira · `Bomb defused` → alicate · `Bomb detonated` → bomba · `Round timer expired` → relógio |
| `ceremonia` | `CeremonyAce` "Ace", `CeremonyTeamAce` "Team Ace", `CeremonyClutch` "Clutch", `CeremonyFlawless` "Flawless", `CeremonyThrifty` "Thrifty", `CeremonyCloser` "Closer"; `CeremonyDefault` não mostra nada |
| `lado_vencedor`, `lado` | `Attacker` → "Ataque" · `Defender` → "Defesa" |
| `compra_atk`, `compra_def`, `compra` | mostrados como vêm: Pistol, Eco, Semi-eco, Semi-buy, Full buy (termos do vlr.gg) |
| `metade` | já vem em português: "1ª metade", "2ª metade", "Prorrogação" |
| `categoria_meio` | Rifle, Sidearm, Sniper, SMG, Heavy, Shotgun, Melee, Ability, e no kill feed Bomb ("Spike"), Fall ("Queda"), Crush ("Esmagado") |

## 6. Layout e design

### 6.1 Shell

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ VAVA Stats   Ranking   Partidas   Análises   Mapas                  [🔍 Buscar jogador ou time] │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                         conteúdo da rota (largura máxima 1440 px)                         │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Circuito universitário de Valorant · 336 partidas · dados carregados em 21/10/2026 16:50   │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

- Navbar fixa no topo, com o link ativo destacado (`NavLink`). Abaixo de 1024 px, os links vão para um menu
  (botão) e a busca continua visível.
- Responsivo em qualquer computador (F6); as regras estão em 6.6.

### 6.2 Tokens

Os tokens de `index.css` continuam (`--bg` #0a0a0f, `--surface` #12121a, `--surface2` #1a1a26, `--border`,
`--accent` #ff4655, `--text`, `--win`, `--loss`). Um deles é corrigido e entram os tokens de dados (F12). O app
só tem tema escuro:

| Token | Valor | Uso |
|---|---|---|
| `--text-muted` | `#8a8aa3` (era `#6e6e88`) | texto secundário. O antigo tinha 3,5–4,0:1 sobre as superfícies, abaixo do mínimo de 4,5:1 para texto; o novo tem 5,1–5,9:1 |
| `--time-a`, `--time-b` | `#199e70` (verde-água), `#c98500` (âmbar) | as duas equipes de uma partida: barra de rounds, economia, kill feed, heatmap, grafo e matriz de duelos |
| `--atk`, `--def` | `#e66767` (vermelho), `#3987e5` (azul) | lados em gráficos de Time, Mapa e Análises; polos da matriz divergente (8) |
| `--bom`, `--ruim` | `var(--win)` #4caf50, `var(--loss)` #ff5252 | cor por qualidade dos números (6.3); 5,4:1 ou mais em todas as superfícies |
| `--neutro` | `#383835` | meio da escala divergente |
| `--serie-1` … `--serie-8` | seção 8 | séries dos gráficos genéricos |
| `--outros` | `var(--text-muted)` | categoria "Outros" |

- **Time e lado nunca são coloridos na mesma visão.** Na Partida, a cor é do time e o lado aparece como texto
  ou ícone (`Swords` ataque, `Shield` defesa). Em Time, Mapa e Análises, a cor é do lado.
- Texto nunca usa cor de série: o nome do time fica na cor do texto, com um marcador (ponto ou barra) na cor
  do time ao lado.
- `--accent` é só da interface (logo, link ativo, foco), nunca de dados.
- Fonte Inter servida localmente (F9), com `font-variant-numeric: tabular-nums` em tabelas e eixos.

### 6.3 Cor por qualidade

Como no csstats, os números ficam verdes (`--bom`) quando estão bons e vermelhos (`--ruim`) quando estão
fracos. Os limiares são o 1º e o 3º quartis dos 222 jogadores do ranking (100+ rounds, medido em
21/10/2026) e ficam fixos em `formatos.js` (F16):

| Métrica | Vermelho (≤) | Verde (≥) |
|---|---|---|
| `acs` | 177 | 222 |
| `adr` | 118 | 148 |
| `kd` | 0,84 | 1,15 |
| `kast_pct` | 67,6 | 75,1 |
| `hs_pct` | 22,2 | 29,4 |
| `fk_round` | 0,06 | 0,13 |
| `win_pct`, `atk_win_pct`, `def_win_pct`, `pistol_win_pct` | 45 | 55 |
| `mais_menos`, `saldo_rounds` | < 0 | > 0 |

Entre os limiares, a cor é a normal do texto. Os mesmos limiares valem no placar de uma partida. A cor nunca é
o único sinal: `+/−` tem sinal e o resultado tem texto ("V"/"D").

### 6.4 Componentes compartilhados

| Componente | Faz | Usado em |
|---|---|---|
| `Navbar`, `Busca` | shell e busca com sugestões (7.9) | todas; a Home tem uma versão grande da `Busca` |
| `BarraFiltros` | selects dos filtros comuns ligados à URL; prop `campos` | Ranking, Partidas, Análises, Mapa, abas de heatmap |
| `Abas` | links de abas (`NavLink`) ou abas por query (`?categoria=`) | Ranking, Partida, Jogador, Time, Análises |
| `Tabela` | colunas declarativas `{chave, rotulo?, formato?, cor?, link?}`; ordenação **no cliente** ou via `onOrdenar` (no servidor); linha clicável; primeira coluna e cabeçalho fixos, com rolagem própria (6.6) | quase todas |
| `StatTile` | rótulo + valor grande colorido + legenda | cabeçalhos de Jogador, Time e Partida |
| `Nick`, `NomeTime` | link para o perfil com formatação padrão; numa partida, o time leva um marcador na cor dele | tabelas, kill feed |
| `SeloAgente` | iniciais do agente num selo neutro, ou o ícone de `public/agentes/` quando existir (F4) | placar, ranking, kill feed |
| `LinhaPartida` | mapa (miniatura), data, torneio·fase, time A placar × placar time B, MVP; destaca um time se receber `timeId` | Home, Partidas, Time, Jogador |
| `BarraRounds` | histórico de rounds (7.4) | Partida |
| `MapaCalor` | imagem do minimapa + `HeatmapCanvas` + "N eventos" | abas de heatmap, Mapa |
| `GraficoAnalise` | renderiza qualquer análise pelo `grafico.tipo` (seção 8) | Análises, Análise, Mapa, Home |
| `Histograma` | distribuição de uma métrica (`/jogadores/distribuicao`) | Ranking |
| `GrafoDuelos` | grafo de força dos duelos | Partida › Duelos |
| `Estado` | carregando (esqueleto), erro (com "tentar de novo"), vazio | todas |
| `AvisoAmostra` | selo "amostra pequena (n = 3)" (R8 do backend) | análises, mapas, cards |

### 6.5 Estados

- **Carregando**: esqueleto com a forma do conteúdo (linhas cinza em tabelas, retângulo no gráfico). As rotas
  respondem em menos de 150 ms, então não vale animação elaborada.
- **Erro 404 da API** (jogador, time, partida ou análise inexistente): página "Não encontrado" com link para a Home.
- **Backend fora do ar**: aviso global (5.1) e o `Estado` de erro em cada bloco.
- **Vazio**: filtros sem resultado. As análises devolvem `dados: []` e o `insight` "Sem dados para os
  filtros escolhidos.", e o front mostra esse texto.
- **Amostra pequena (R8)**: qualquer linha com menos de 5 partidas aparece esmaecida com o `AvisoAmostra`. A
  amostra vem da coluna `grafico.n`, quando a análise informa, ou senão de `partidas`/`partidas_mapa` (F11).
  Hoje isso pega Pearl (3 partidas) e Fracture (2); Breeze (5) fica no limite.

### 6.6 Responsividade

A aplicação vai rodar em computadores de tamanhos diferentes (F6). Ela precisa funcionar bem de 1024 a
2560 px de largura, inclusive em telas baixas (1366×768, 1280×720), e continuar utilizável em 768 px (tablet)
e 390 px (celular).

| Largura | Comportamento |
|---|---|
| 1280 px ou mais | Layout completo, centralizado com no máximo 1440 px. Home e Mapa em duas colunas; controles do heatmap ao lado do mapa |
| 1024–1279 px | O mesmo layout, mais estreito. Tabelas largas, como a do Ranking, passam a rolar dentro do bloco |
| 768–1023 px | Uma coluna; links da navbar num menu; controles do heatmap acima do mapa; tabelas com densidade compacta |
| menos de 768 px | Tudo empilhado; no cabeçalho da Partida, um time embaixo do outro; tiles em duas colunas |

Regras que valem em todas as larguras:

- **A página nunca rola na horizontal.** O que é largo (tabelas, `BarraRounds`, matriz de compras) rola
  dentro do próprio bloco.
- **Tabelas**: a primeira coluna (jogador ou time) e o cabeçalho ficam fixos (`position: sticky`). Nenhuma
  coluna é escondida: em tela estreita, a tabela rola.
- **Grades fluidas**: tiles, KPIs e cards de mapa usam `repeat(auto-fit, minmax(…, 1fr))` e se reorganizam
  sozinhos, sem breakpoint.
- **Gráficos**: largura de 100% (`ResponsiveContainer`) e altura fixa por faixa (280 px; 220 px abaixo de
  768 px). Barras com mais de 8 categorias ficam horizontais (8).
- **Heatmap**: o mapa é quadrado e cabe na altura da tela, inclusive com 768 px de altura (9).
- **Grafo de duelos**: mede o próprio contêiner (`ResizeObserver`) e redesenha quando ele muda de tamanho.
- **Toque**: com `@media (pointer: coarse)`, alvos de pelo menos 44 px; os tooltips abrem com toque.
- **Telas de alta densidade** (MacBook, monitores 4K com escala): o canvas do heatmap usa `devicePixelRatio`
  (até 2), para não ficar borrado (9).

Larguras de conferência, no modo responsivo do DevTools: 1920, 1366×768 e 1024×768 em cada checkpoint;
2560, 1280×720, 768 e 390 no fechamento.

## 7. Páginas

Cada página lista as rotas, os endpoints e o critério de aceite. Os números de conferência foram medidos em
21/10/2026 contra o backend local.

### 7.1 Home · `/` · P0

`GET /api/resumo` (uma chamada).

```
            Estatísticas do circuito universitário de Valorant
        [ 🔍 Buscar jogador ou time ...                              ]
   336 partidas · 411 jogadores · 68 times · 6.618 rounds · 46.371 abates

 ┌ 51,8% ──────────┐ ┌ 86,5% ──────────┐ ┌ 75,5% ──────────┐ ┌ 61,9% ──────────┐
 │ Rounds vencidos │ │ Pistol convertido│ │ Ataque vence    │ │ Abates com      │
 │ pelo ataque     │ │ no round seguinte│ │ após o first kill│ │ Vandal ou Phantom│
 └─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘

 Últimas partidas                              │ Top jogadores          ACS
 27/09 Haven  Wolf Gaming 13 × 1 Minerva Th.   │ 1 lule#dfnt            287
 …                                    (8)      │ …                      (5)
 Ver todas as partidas →                       │ Top times              V-D
                                               │ 1 Ceub Octopus         9-0
                                               │ …                      (5)
```

- Cada card de KPI mostra `valor` + `unidade`, `titulo` e `descricao`, e leva para `/analises/{analise_id}`.
- "Top jogadores" leva para `/ranking` e "Top times" para `/ranking/times`. A Home e as páginas de destino
  usam o mesmo corte: 100 rounds e 8 partidas (F1).
- *Aceite:* os contadores e os 4 KPIs batem com os números acima; clicar numa partida, num jogador ou num time
  abre a página certa.

### 7.2 Ranking · `/ranking` (P0) e `/ranking/times` (P1)

**Jogadores**: `GET /api/jogadores` e `GET /api/jogadores/distribuicao`.

```
 Ranking   [Jogadores] [Times]
 [Todos] [Abyss] [Ascent] [Breeze] [Fracture] [Haven] [Lotus] [Pearl] [Split] [Summit] [Sunset]
 Torneio ▾  Fase ▾  Time ▾  Agente ▾  Função ▾  Mín. rounds: 100 ▾
 ┌ distribuição de ACS (histograma, 20 faixas) ─────────────────────────────┐
 └──────────────────────────────────────────────────────────────────────────┘
  #  Jogador            Time        Agente  P   Win%  ACS▼  K/D   ADR  KAST  HS%  FK/R  +/−
  1  lule#dfnt          Macklogic…  Sova    12  91,7% 287   1,68  188  81,0% 30,7% 0,23 +91
```

- O mapa é escolhido por chips, como as abas de mapa do Leaderboards; os demais filtros ficam em selects.
- **Ordenação no servidor**: clicar no cabeçalho grava `?ordenar=kd` (clicar de novo inverte `ordem`) e refaz a
  chamada. Assim a coluna `#` (`posicao`) continua certa. Colunas ordenáveis: as métricas aceitas pela API
  (`partidas`, `win_pct`, `acs`, `kd`, `adr`, `kast_pct`, `hs_pct`, `kpr`, `fk_round`, `mais_menos`…).
- O histograma mostra a métrica de `ordenar` (`?metrica=` igual a `ordenar`) com os mesmos filtros e o mesmo
  `min_rounds`. Tooltip: faixa, jogadores, `%` e `% acumulado`.
- `min_rounds`: seletor com 50, 100 (padrão, F1), 150 e 200.
- Mostra 100 linhas (`limite` padrão); "Mostrar todos" usa `limite=1000`.
- *Aceite:* sem filtros, 100 linhas (de 222 elegíveis) e o 1º é lule#dfnt (ACS 287); com `min_rounds=50`,
  TORONTO#lulu (3 partidas) passa a 1º; `?mapa=Ascent` muda tabela e histograma; o link copiado reabre a
  mesma visão.

**Times** (P1): `GET /api/times`. Colunas `#`, Time, Partidas, V-D, Win%, Saldo, ATK%, DEF%, Pistol%.
A API não aceita `ordenar` aqui: a ordem padrão (win% e depois saldo) vem do servidor e as outras colunas
ordenam **no cliente**, mantendo a `posicao` original. Seletor `min_partidas`: 0, 5, 8 (padrão, F1) e 10. O
front sempre envia o valor, porque o padrão da API é 0.

### 7.3 Partidas · `/partidas` · P0

`GET /api/partidas` (336 partidas, ~170 KB, sem paginação na API).

- Lista de `LinhaPartida`, mais recentes primeiro, com paginação local de 30 em 30 ("Carregar mais").
- Filtros: torneio, fase, mapa e time.
- Cada linha mostra a miniatura do mapa, a data, torneio · fase · `codigo`, os dois times com placar (vencedor em
  destaque), o MVP (nick e ACS) e a duração. A linha abre `/partidas/{match_id}`.
- *Aceite:* 336 partidas sem filtro; `?time=ufmt_turuna` mostra 36.

### 7.4 Partida · `/partidas/:id` · P0 (Placar, Rounds) e P1 (Heatmap, Duelos)

O layout busca `GET /api/partidas/{id}` (cabeçalho e placar); cada aba busca o próprio sub-recurso.

```
┌──────────────────── banner: imagem do mapa esmaecida ────────────────────┐
│ Univavá · Fase de Grupos · 032b · 27/09/2026 · Haven · 14 rounds · 22 min  │
│        Wolf Gaming    13  ×  1    Minerva Thunders                         │
│        ATK 2 · DEF 11 · pistols 2  │  ATK 1 · DEF 0 · pistols 0            │
├────────────────────────────────────────────────────────────────────────────┤
│ [Placar] [Rounds] [Heatmap] [Duelos]                                       │
```

**Placar** (`/partidas/:id`): a `BarraRounds` compacta e uma tabela por time (5 jogadores, ordenados por ACS):
Jogador (agente + nick), K, D, A, +/−, ACS, ADR, KAST, HS%, FK, FD, MK. O MVP (`partida.mvp`) leva um selo.
Linha do time: `atk_rounds`, `def_rounds`, `pistols`, `first_kills`.

**Rounds** (`/partidas/:id/rounds`): `GET /rounds` + `GET /abates`.

```
 Round      1  2  3  4  5  6  7  8  9 10 11 12 │ 13 14
 Wolf       D  E  D  E  D  E  D  E  E  E     D │  E  E
 Minerva                                  E    │
 Cerimônia     F     F                         │     F

 E eliminação (caveira) · D defuse (alicate) · B spike explodiu (bomba) · T tempo esgotado (relógio) · F Flawless
```

- `BarraRounds`: uma coluna por round; o ícone fica na linha do time vencedor, na cor dele, e indica o
  `resultado`. Há um divisor na troca de lado (entre o 12 e o 13) e outro no início da prorrogação. A
  cerimônia aparece como selo pequeno. O lado aparece como texto ou ícone (`Swords`/`Shield`), nunca como
  cor: na Partida, a cor é sempre do time (F12).
- Clicar num round abre o detalhe: quem atacou, compra e loadout de cada lado, site do plant, defuse, first kill
  (killer → vítima, tempo) e o **kill feed** daquele round (`/abates` filtrado no cliente). Os registros com
  `valido: false` aparecem como "morreu para a Spike", "queda" ou "teamkill".
- Gráfico de economia: loadout de cada time por round (linha), com a cor do time. O loadout vem do lado
  (`loadout_atk`/`loadout_def`) e é associado ao time por `time_atacante_id`/`time_defensor_id`.
- *Aceite:* a partida `69e7e59f-f9e2-4127-9e76-4ca85c045c0a` mostra 14 rounds, 13 de Wolf Gaming e 1 de
  Minerva Thunders (o 11, no ataque); o round 1 é um pistol vencido pela defesa com defuse, e há selos de
  Flawless nos rounds 2, 4 e 14.

**Heatmap** (`/partidas/:id/heatmap`, P1): `GET /abates` (todos os abates numa resposta; 94 registros nessa
partida) + `GET /rounds` (para saber o lado). Filtro **no cliente**, sem nova requisição: tipo (Kills ou
Mortes), time, jogador, metade (1ª, 2ª ou prorrogação) e lado. Em "Kills" ficam de fora `valido: false` e
`killer_pos: null` (R1 e R5 do backend). O kill feed completo fica ao lado do mapa.

**Duelos** (`/partidas/:id/duelos`, P1): `GET /duelos`. Duas visões:

- **Matriz 5 × 5** (padrão): linhas com os jogadores do time A, colunas com os do time B, e a célula
  `kills_a – kills_b` colorida pelo vencedor do duelo. É a leitura mais rápida.
- **Grafo** (`GrafoDuelos`): nós com tamanho por `kills` e cor do time; arestas com o placar do duelo.
- *Aceite:* 10 nós e 25 arestas nessa partida; a soma das células é igual ao total de abates válidos.

### 7.5 Jogador · `/jogadores/:puuid` · P0 (Resumo, Partidas) e P1 (demais abas)

O layout busca `GET /api/jogadores/{puuid}`; as abas Agentes, Mapas e Armas reaproveitam a mesma resposta.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ lule #dfnt              #1 no ranking · Macklogic Red (7) · Macklogic Rainbow (5) │
│ antes: —                Sova (Iniciador) · 12 partidas · 221 rounds            │
├────────┬────────┬────────┬────────┬────────┬────────┬────────┬────────────────┤
│ ACS 287│ K/D 1,68│ ADR 188│KAST 81,0%│HS 30,7%│Win 91,7%│FK/R 0,23│ +/− +91       │
├────────┴────────┴────────┴────────┴────────┴────────┴────────┴────────────────┤
│ [Resumo] [Partidas] [Agentes] [Mapas] [Armas] [Heatmap]                        │
```

- Cabeçalho: `nick`, `nicks_anteriores` ("antes: …"), `times` (links, com o nº de partidas por time: um
  jogador pode ter jogado por mais de um, R9), agente e função principais e `posicao_ranking` ("#14 no
  ranking"; quando é `null`, "fora do ranking, menos de 100 rounds").
- **Resumo**: tiles + gráfico de **evolução** (linha por partida em ordem de data, com seletor de métrica
  ACS/ADR/K/D/KAST; o ponto é cheio e `--bom` na vitória, vazado e `--ruim` na derrota) + top 3 agentes, top 3
  mapas e top 5 armas,
  cada bloco com "ver tudo" levando à aba.
- **Partidas** (`/partidas`): `GET /jogadores/{puuid}/partidas`. Tabela: data, mapa, time, adversário,
  placar, V/D, agente, K, D, A, +/−, ACS, ADR, KAST, HS%, FK, MK. A linha abre a partida.
- **Agentes**: `por_agente` (partidas, win%, ACS, K/D, ADR, KAST).
- **Mapas**: `por_mapa` como cards com a imagem do mapa ao fundo (partidas, win%, ACS, K/D).
- **Armas**: `armas` como barras horizontais (`pct`), agrupadas por `categoria_meio`.
- **Heatmap**: `GET /heatmap?mapa=<m>&jogador=<puuid>&tipo=kills|mortes`, com o mapa escolhido entre os de
  `por_mapa` (padrão: o mais jogado) e filtros de lado, torneio e fase.
- *Aceite:* lule#dfnt mostra "#1 no ranking", 12 partidas, ACS 287 e dois times (Macklogic Red, 7 partidas;
  Macklogic Rainbow, 5); TORONTO#lulu (56 rounds) mostra "fora do ranking".

### 7.6 Time · `/times/:id` · P1

O layout busca `GET /api/times/{id}`.

- Cabeçalho: nome, torneios, campanha (V-D), win%, saldo de rounds; tiles de ATK%, DEF% e Pistol%.
- **Visão geral**: últimas partidas (`/times/{id}/partidas`, 5), desempenho por tipo de compra (`economia`,
  barras de win% com o nº de rounds) e resumo por mapa.
- **Elenco** (`/elenco`): `elenco` na `Tabela` (as mesmas colunas do ranking, só com as partidas pelo time).
- **Mapas** (`/mapas`): `por_mapa` (partidas, win%, saldo, ATK%, DEF%) e, por mapa, as `composicoes` (5
  agentes, partidas, win%).
- **Partidas** (`/partidas`): `GET /times/{id}/partidas` com filtros de torneio, fase e mapa; `LinhaPartida`
  com o time em destaque.
- **Confrontos** (`/confrontos`): adversário, partidas, vitórias e derrotas, com link para o adversário.
- **Heatmap** (`/heatmap`): `GET /heatmap?mapa=<m>&time=<id>&tipo=…`, com o mapa vindo de `por_mapa`.
- *Aceite:* `azure_bears_golden` mostra 3 torneios e economia com Full buy em 71,2%; a soma de partidas em
  `por_mapa` e em `confrontos` bate com o resumo.

### 7.7 Análises · `/analises` e `/analises/:id` · P0 ("ver dados" na P1)

`GET /api/analises` (lista) e um `GET /api/analises/{id}` por card, todos com os filtros da página.

- Abas por `categoria`, montadas **a partir da lista** (uma categoria nova no backend vira aba sozinha).
  Rótulos: `mapas` "Mapas", `momentos` "Momentos decisivos", `economia` "Economia", `meta` "Meta",
  `jogadores` "Jogadores"; categoria sem rótulo aparece com a primeira letra maiúscula.
- `BarraFiltros` com os 6 filtros, valendo para todos os cards da aba.
- Card: título, `insight` em destaque, `GraficoAnalise`, descrição recolhível e link "abrir".
- **Tela cheia** (`/analises/:id`): o mesmo card em largura total, com "ver dados" (tabela com todas as
  colunas de `dados`) e o `kpi`, se houver.
- *Aceite:* as 9 análises aparecem nas 5 abas; `?mapa=Ascent` muda os números; um arquivo novo em
  `backend/app/analises/` aparece na página sem mudança no front.

### 7.8 Mapas · `/mapas` e `/mapas/:mapa` · P1

- **`/mapas`**: grade de cards (imagem ao fundo) para os 10 mapas de `/filtros`, com partidas e % de rounds
  vencidos pelo ataque, ambos de `/analises/lado-por-mapa` (uma chamada). Pearl e Fracture levam o
  `AvisoAmostra`.
- **`/mapas/:mapa`** (ex.: `/mapas/Ascent`, o nome como vem da API):
  - explorador de heatmap: `GET /heatmap?mapa=Ascent` com tipo (Kills, Mortes ou Plants), lado e filtros
    (torneio, fase, time, agente, função). Ex.: tipo Mortes + agente Jett = onde os Jetts morreram;
  - `plant-sites`, `meta-agentes` e `lado-por-mapa` com `?mapa=Ascent`, pelo `GraficoAnalise`;
  - top 10 jogadores no mapa (`/jogadores?mapa=Ascent&limite=10`).
- *Aceite:* Ascent com tipo Plants mostra 1.049 pontos sobre os sites; kills sem filtro, 11.621.

### 7.9 Busca e 404 · P0

- **Busca** (navbar e Home): `GET /api/busca?q=` com debounce de 250 ms, só a partir de 2 caracteres. A lista
  suspensa mostra até 10 resultados com ícone de tipo, `nome` e `detalhe` (time do jogador ou "11 partidas").
  ↑/↓ navegam, Enter abre o selecionado (ou o primeiro) e Esc fecha. A busca ignora acento e caixa e encontra
  nicks antigos (o backend cuida disso).
- **404**: rota desconhecida ou recurso inexistente → "Não encontrado" + busca + link para a Home.
- *Aceite:* `stars` traz Usp Stars e Usp Stars Gc; `q` com 1 caractere não chama a API.

## 8. Análises genéricas (o ponto de extensão)

O backend descreve o gráfico de cada análise no campo `grafico` (spec do backend, §8.5). O front tem **um**
componente, `GraficoAnalise`, que escolhe o desenho pelo `grafico.tipo`:

| `tipo` | Componente | Como lê o `grafico` | Análises hoje |
|---|---|---|---|
| `barras` | `graficos/Barras.jsx` (recharts) | `x` categoria, `y` valor, `serie` cor/legenda, `referencia` linha tracejada, `rotulo_x`/`rotulo_y` | lado-por-mapa, first-kill, meta-armas, metricas-vitoria, plant-sites |
| `linha` | `graficos/Linha.jsx` | `x` e `y` numéricos, `referencia` | vantagem-economica |
| `dispersao` | `graficos/Dispersao.jsx` | `x`, `y`, `serie` | — (já suportado pela API) |
| `matriz` | `graficos/Matriz.jsx` (grid CSS) | `x` colunas, `y` linhas, `valor` cor, `n` amostra, `ordem` das categorias nos dois eixos, `min_n`: abaixo dele a célula fica cinza com "n < 30" | compras |
| `tabela` | `Tabela` | `colunas` na ordem; ordenação no cliente | meta-agentes |
| `kpi` | `graficos/Kpis.jsx` | um card por linha: `x` rótulo, `y` valor | pistol |

Regras do renderizador:

- Valores e eixos usam a formatação por nome de coluna (5.4): `atk_win_pct` sai como "47,3%" sem configuração.
- Barras com mais de 8 categorias ficam horizontais (`meta-armas` tem 28 armas), para os rótulos caberem em
  qualquer largura (6.6).
- `dados` vazio → `Estado` vazio com o `insight` da API.
- **`tipo` desconhecido → cai na `Tabela` com todas as colunas.** Um tipo novo no backend nunca quebra a página.
- Aviso de amostra pequena (6.5) por linha, pela coluna de `grafico.n` ou, na falta dela, por `partidas` ou
  `partidas_mapa` (F11).

**Cores** (F13 e F15):

- Ordem fixa das séries (`--serie-1` a `--serie-8`): `#3987e5` · `#d95926` · `#199e70` · `#c98500` ·
  `#d55181` · `#008300` · `#9085e9` · `#e66767`. Com uma série só, vale a cor 1.
- **Séries agrupadas** (barras lado a lado ou várias linhas): até 4, nas cores 1–4. Dimensões com mais valores
  (mapas, agentes, times) viram um seletor no card. É o caso do `plant-sites`, que tem `serie = mapa`.
- **Cor por categoria em barras isoladas** (`meta-armas`, por `categoria_meio`) **e na dispersão**: no máximo
  3 categorias coloridas; o resto vai para "Outros" (`--outros`).
- **A cor segue o valor, nunca a posição.** O slot vem de uma lista fixa: as funções do `/filtros` ou o
  dicionário `CORES_SERIE` em `constants.js` (hoje Rifle → 1, Sidearm → 2, Sniper → 3). Assim, um filtro que
  some com uma série não repinta as outras. Valor fora da lista → "Outros".
- **Matriz**: cor divergente em torno de 50. `--def` (a defesa vence mais) ← `--neutro` → `--atk` (o ataque
  vence mais), misturados com `color-mix(in oklab, …)`, com no máximo 50% do polo, atingido a 25 pontos de
  distância de 50. Assim o texto das células fica com 5,0:1 ou mais. Célula com `n < min_n`: fundo
  `--surface2` e "n < 30" em `--text-muted`.
- Legenda sempre que houver 2+ séries, tooltip em todos os gráficos e "ver dados" (tabela) na tela cheia.

**Como adicionar um tipo de gráfico novo:**

1. Criar `vava/src/graficos/<Tipo>.jsx`, que recebe `{dados, grafico}`.
2. Registrar no objeto `GRAFICOS` de `GraficoAnalise.jsx` (`{barras: Barras, …}`).
3. Documentar os campos do `grafico` que ele usa na tabela acima e na spec do backend (§8.5).

## 9. Heatmap

- `MapaCalor` sobrepõe o `HeatmapCanvas` à imagem `public/maps/<mapa em minúsculas>.png`. Os pontos `{x, y}`
  da API já estão em `[0,1]` (x → direita, y → baixo) e vão direto para o canvas como `[x, y]`, sem
  calibração no front.
- **Cor** (F14): uma rampa de um tom só no lugar do arco-íris atual. As paradas são `#a93900`, `#d1521d`,
  `#f57242`, `#ffa383` e `#fed3c4` (OKLCH L de 0,50 a 0,90, no matiz do laranja da série 2), com opacidade de
  ~0,15 a ~0,9: mais claro e mais opaco = mais eventos. No `HeatmapCanvas`, só a função `heatColor(t)` muda
  (interpolar entre as paradas).
- **Tamanho** (6.6): o mapa é quadrado, com `width: min(100%, calc(100vh − altura do cabeçalho))`, para caber
  em telas com 768 px de altura. O canvas usa `devicePixelRatio` (até 2) e, ao redimensionar, redesenha no
  máximo uma vez por quadro (`requestAnimationFrame`).
- Duas fontes de pontos:
  - `GET /api/heatmap` (agregado; Mapa, Jogador, Time): o servidor filtra e devolve `{mapa, tipo, total, pontos}`.
  - `GET /api/partidas/{id}/abates` (uma partida): o cliente filtra, porque a resposta já tem tudo.
- O contador "N eventos" usa `total` (ou o tamanho da lista filtrada). Com menos de 20 pontos, o mapa de
  calor engana: mostrar o aviso "poucos eventos" (modo "pontos" é P2).
- Desempenho: o maior caso, kills em Ascent sem filtro, tem 11.621 pontos (~276 KB). O `HeatmapCanvas` atual
  cria um gradiente por ponto. Se o redesenho passar de ~200 ms, desenhar um "carimbo" pré-renderizado com
  `drawImage` em vez de `createRadialGradient` a cada ponto.

## 10. Execução e qualidade

```sh
# terminal 1, na raiz do repositório
.venv/bin/uvicorn app.main:app --reload --app-dir backend --port 8000
# terminal 2
cd vava && npm install && npm run dev        # http://localhost:5173 (o proxy repassa /api para :8000)
npm run lint && npm run build                # antes de abrir PR
```

**Critério de pronto de uma página:**

1. Funciona com dados reais e abre direto pela URL (F5 na página).
2. Tem os estados de carregando, erro e vazio.
3. Os filtros e a aba ficam na URL e o botão voltar funciona.
4. Sem erro no console; `npm run lint` e `npm run build` passam.
5. O *Aceite* da página na seção 7 foi conferido à mão.
6. Funciona nas larguras de conferência (6.6), sem rolagem horizontal da página.

**Roteiro de conferência** (substitui testes automatizados na v1; leva ~10 min):

| URL | Conferir |
|---|---|
| `/` | 336 / 411 / 68 / 6.618 / 46.371; KPIs 51,8%, 86,5%, 75,5%, 61,9% |
| `/ranking` | 1º lule#dfnt (ACS 287); com `min_rounds=50`, 1º TORONTO#lulu |
| `/ranking/times` | 34 times (8+ partidas): Ceub Octopus (9-0), Macklogic Red (10-1), Ufu Saints (14-4)… |
| busca `toronto` → perfil | "fora do ranking" (56 rounds) |
| `/partidas?time=ufmt_turuna` | 36 partidas |
| `/partidas/69e7e59f-f9e2-4127-9e76-4ca85c045c0a` | Wolf Gaming 13 × 1 Minerva Thunders em Haven; MVP bielmonster#prime (ACS 379) |
| `/partidas/69e7e59f-…/duelos` | 10 jogadores, 25 duelos |
| `/analises?categoria=momentos` | first-kill e pistol; o pistol mostra 86,5% no insight |
| `/mapas/Ascent` com tipo Plants | 1.049 pontos, concentrados nos sites A e B |
| `/jogadores/nao-existe` | página "Não encontrado" |
| backend desligado | aviso global com o comando para subir |
| larguras de 6.6 (DevTools, modo responsivo) | nada vaza da tela; tabelas e barra de rounds rolam dentro do próprio bloco |

## 11. Ajustes no backend

Nenhum bloqueia o front. O que ficou decidido para cada um (F1 e F11):

| Ajuste | Decisão |
|---|---|
| **Filtros nos perfis**: aceitar `Filtros` em `/jogadores/{puuid}`, `/jogadores/{puuid}/partidas` e `/times/{id}` ("como esse jogador foi na Fase de Grupos?") | Fora da v1: os perfis mostram todos os torneios. Se entrar depois, basta mostrar a `BarraFiltros` nessas páginas |
| **`grafico.n` em todas as análises**: hoje só a `matriz` diz qual coluna é a amostra | Sem mudança no backend agora. O front lê `grafico.n` quando existir e, senão, usa `partidas`/`partidas_mapa` (6.5) |
| **Lado nos abates da partida**: `/partidas/{id}/abates` não traz `lado_killer`/`lado_vitima` | O front deriva o lado de `/rounds`, que a aba já busca |
| **`/resumo` sem `min_rounds`**: o top 5 da Home usava o corte fixo de 50 | **Feito** (F1): `MIN_ROUNDS_PADRAO` passou a 100 em `backend/app/routers/jogadores.py`, e os testes foram ajustados (103 passam) |
| **Spec do backend desatualizada em detalhes**: as respostas reais são um superconjunto do documentado. `por_agente` e `por_mapa` do jogador trazem também `vitorias`, `rounds`, `adr` e `kast_pct`; `por_mapa` do time traz `vitorias` e `saldo_rounds`; `pistol` devolve linhas `{pistol, rounds, conversao_pct}` | Pendente: corrigir a seção 8 da spec do backend. Esta spec já usa as respostas reais |

## 12. Decisões

Tomadas em 21/10/2026 por quem vai implementar o front. Para mudar uma decisão, atualize a linha aqui e as
seções da coluna "Onde" no mesmo PR.

### 12.1 Produto

| # | Decisão | Por quê | Onde |
|---|---|---|---|
| F1 | **Corte de amostra: 100 rounds para jogadores, 8 partidas para times.** O backend passou a usar 100 como padrão (`MIN_ROUNDS_PADRAO`), o que vale para o Ranking, a Home e o "#N no ranking" do perfil. Para times, o corte é 8 na Home (já era) e no Ranking › Times (o front envia `min_partidas=8`, porque o padrão da API é 0). O Ranking tem seletores: 50/100/150/200 rounds e 0/5/8/10 partidas | Com 50 rounds, o 1º lugar tinha 3 partidas (TORONTO#lulu) e a mediana do top 10 era 4,5. Com 100, o 1º é lule#dfnt (12 partidas), a mediana do top 10 sobe para 12 e ficam 222 dos 411 jogadores. Mudar só no front deixaria a Home e o perfil, que o front não controla, com outro corte. Com 8 partidas ficam 34 dos 68 times, o mesmo corte da EDA | 7.1, 7.2, 7.5, 10; D4 e D5 do backend |
| F2 | **ACS é a métrica principal** (tile de destaque e ordenação padrão). Sem rating composto | É o número que quem joga Valorant reconhece, e ele já vem calculado. Um rating exigiria escolher e justificar pesos, sem tempo para validar. O KAST, a métrica mais ligada à vitória (r ≈ 0,59), aparece em tile e em coluna | 6.3, 7.2, 7.5; D1 do backend |
| F3 | **Nomes dos times como a API devolve** ("Usp Stars", "Ufmt Turuna") | Os JSONs não têm nome de time (só Red/Blue, e `customGameName` vem vazio): a única fonte é o slug do arquivo, e adivinhar siglas arrisca publicar nome errado. Se alguém do circuito montar a lista oficial, ela entra como um dicionário em `reference/` lido pelo `dados.py`, sem mudança no front | — |
| F4 | **Ícones: iniciais na P0, imagens baixadas na P1.** O `SeloAgente` mostra as iniciais do agente num selo neutro. Na P1, um script baixa uma vez os ícones de agentes e armas da valorant-api para `vava/public/agentes/` e `vava/public/armas/` (os UUIDs estão no `reference/`), e o selo usa a imagem quando ela existe. Nada é carregado de fora em tempo real e não há cor por função | A demo não pode depender de internet, e as iniciais não bloqueiam nada. Cor por função exigiria 4 cores distinguíveis lado a lado, e o validador de paleta só aprova 3 nesse uso; a função já aparece em texto | 3, 6.4 |
| F5 | **Um valor por filtro** na v1; multisseleção na P2 | Select simples é o mais rápido. A URL e a API já aceitam valores repetidos, então a P2 só troca o componente | 5.2 |
| F6 | **Responsivo desde a P0** (revista em 21/10/2026): funciona bem de 1024 a 2560 px de largura, inclusive em telas baixas, e continua utilizável em 768 e 390 px. A página nunca rola na horizontal; tabelas e blocos largos rolam dentro de si | A aplicação vai rodar em computadores de tamanhos diferentes. A versão anterior (desktop primeiro, mobile na P2) supunha uma única máquina de demo | 6.1, 6.6, 9, 10 |
| F7 | **O upload de JSONs sai** (`DropZone`, `Sidebar`, `MatchCard`, `utils.js`, `assets/maps/calibration.json`) já na primeira tarefa | O backend lê `data/`; manter dois caminhos de dados dobra a manutenção. O heatmap e o grafo continuam, como abas da Partida | 4.2 |

### 12.2 Técnica

| # | Decisão | Por quê | Onde |
|---|---|---|---|
| F8 | **Versões**: `react-router@8` (8.5.0), `recharts@3` (3.10.1), `lucide-react@1` (1.61.0), `@fontsource-variable/inter@5` (5.3.0) | Foram instaladas juntas com o React 19.3.1 do `vava/` numa pasta de teste. As APIs que a spec usa existem (`createBrowserRouter`, `RouterProvider`, `NavLink`, `useSearchParams`; `BarChart`, `ReferenceLine`…; os ícones `Skull`, `Wrench`, `Bomb`, `Timer`, `Swords`, `Shield`), e o `react-is` fica fixo em 19.3.1 no `package.json`: sem isso, o `vava/` resolve a 16.13.1 trazida pelo `prop-types` do `react-force-graph-2d`, que não reconhece os elementos do React 19. A spec dizia react-router 7, mas a versão atual é a 8, que exige React 19.2.7 ou mais | 4 |
| F9 | **Inter servida localmente** (`@fontsource-variable/inter`, importada no `main.jsx`), com `tabular-nums` em tabelas e eixos | O `index.css` já pede a Inter, mas nada a carregava. Assim o visual é o mesmo em qualquer máquina, sem internet | 4, 6.2 |
| F10 | **Backend fora do ar**: o aviso global depende só de `/api/saude`. Num bloco, 502/503/504 ou falha de rede → "backend fora do ar"; 404 → "não encontrado"; outro status → "erro N" + "tentar de novo" | Testado: com o backend desligado, o proxy do Vite responde **502** com corpo vazio, e não "status 0" como a spec supunha. Um 500 do FastAPI é bug, não queda, por isso não aciona o aviso | 5.1 |
| F11 | **Os ajustes de backend da seção 11 ficam fora da v1** (filtros nos perfis, `grafico.n` em todas as análises, lado nos abates) | Nenhum é necessário para a P0, e o front contorna cada um com o que a API já tem | 6.5, 8, 11 |

### 12.3 Cores e números

As cores foram validadas com o `validate_palette.js` da skill de dataviz sobre a superfície dos cards
(`#12121a`). Os textos foram conferidos pelo contraste WCAG, com mínimo de 4,5:1.

| # | Decisão | Por quê | Onde |
|---|---|---|---|
| F12 | **Cores semânticas**: time A `#199e70`, time B `#c98500`, ataque `#e66767`, defesa `#3987e5`; bom e ruim = `--win` e `--loss`; o `--text-muted` passa a `#8a8aa3`. **Time e lado nunca são coloridos na mesma visão**: na Partida, a cor é do time e o lado vira texto ou ícone | Cada par passa sozinho (times: CVD ΔE 8,4 e visão normal 19,8; lados: 19,2 e 29,0), mas os quatro juntos reprovam: ataque × time B dá ΔE 13, abaixo do mínimo de 15. `--win` e `--loss` têm 5,4:1 ou mais em todas as superfícies; o vermelho de status da skill (`#d03b3b`) teria 3,6:1. O `--text-muted` antigo tinha 3,5–4,0:1 | 6.2, 7.4 |
| F13 | **Paleta dos gráficos**: 8 cores em ordem fixa; até 4 séries agrupadas; até 3 categorias quando cada barra tem a sua (o resto vira "Outros"); dimensões com mais valores viram seletor; a cor segue o valor, nunca a posição | A ordem foi validada: o pior par vizinho tem CVD 8,4 e visão normal 19,3, e as 3 primeiras cores, em todos os pares, 9,4 e 20,9. Com 4 ou mais cores em que qualquer par pode ficar lado a lado (dispersão, barras coloridas por categoria), nenhuma ordem passa | 8 |
| F14 | **Heatmap com rampa de um tom** (laranja, de `#a93900` a `#fed3c4`) no lugar do arco-íris | O arco-íris cria fronteiras falsas e não tem ordem visual. Sobre o fundo escuro, mais claro e mais opaco = mais eventos. O laranja se destaca do cinza do minimapa pela saturação e não é cor de time nem de lado | 9 |
| F15 | **Matriz divergente**: defesa (azul) ← neutro `#383835` → ataque (vermelho), com no máximo 50% do polo | Usa o mesmo par de lados da F12. Com o polo puro, o texto da célula cairia para 2,7–3,0:1; com o teto, fica em 5,0:1 ou mais | 8 |
| F16 | **Limiares de cor recalculados** sobre os 222 jogadores do ranking (100+ rounds) e usados também no placar de uma partida | Acompanham a F1. Numa partida os valores oscilam mais, mas a cor é só uma pista: o número está sempre escrito | 6.3 |
| F17 | **Rótulos de coluna**: dicionário `ROTULOS` completo, com todas as colunas que a API devolve hoje | Uma fonte única para tabelas, eixos e "ver dados"; coluna nova sem rótulo ainda aparece legível | 5.4 |
