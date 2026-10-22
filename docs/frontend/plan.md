# Plano — Frontend do dashboard (VAVA Stats)

> Implementa a [spec.md](spec.md), incluindo as decisões F1–F17 (seção 12). Tarefas em [tasks.md](tasks.md).
> **Status: concluído** (fases 0–4, 22/10/2026; corte D: P1 completa). Uma pessoa, fases em sequência. O que
> mudou durante a implementação está na seção 13 da spec.
> Ambiente: Node 22.23.4 (via nvm) · npm 10.9.9 · React 19.3.1 · Vite 8.3.4 · backend na porta 8000 · Vite na 5173.

## 1. Estratégia

Toda página depende de três módulos: `api.js` (busca com cache), `filtros.js` (filtros na URL) e `formatos.js`
(números, rótulos, cores e links). Eles fazem no front o papel que o `BASE` e o `agregar()` fizeram no
backend, por isso vêm primeiro.

Como o front tem uma pessoa só, as fases são sequenciais e a ordem segue o **valor para a demo**. Cada passo
termina com o app funcionando e apresentável: se o prazo acabar no meio do caminho, o que já existe se sustenta
(seção 5).

1. **Fase 0** monta a fundação: limpeza do `vava/`, dependências, tokens, rotas, layout e os três módulos.
2. **Fase 1** constrói a primeira página real, Partidas, com os componentes que ela usa. Os demais nascem no
   passo que os usa primeiro (a `Tabela`, por exemplo, nasce com o Placar): nenhum componente é feito no vazio.
3. **Fase 2** fecha a P0 na ordem do roteiro da demo: Placar → Jogador → Home → Análises → Ranking → Rounds.
4. **Fase 3** faz a P1, começando pelo `MapaCalor`, que serve a quatro páginas.
5. **Fase 4** passa o roteiro de conferência completo da spec (§10), fecha a documentação e faz o envio
   único da aplicação inteira.

```
Fase 0 ──► Fase 1 ──────────► Fase 2 (P0, ordem da demo) ──────────────────────► Fase 3 (P1) ─────► Fase 4
fundação   Partidas e seus    Placar → Jogador → Home → Análises → Ranking → Rounds   MapaCalor primeiro   roteiro
           componentes                                                                                 e envio
```

A API está pronta e testada: não há mock. Os números de conferência da spec vêm do backend real.

## 2. Decisões de implementação

As decisões de produto e de visual estão na spec (F1–F17). Estas são as de código:

| Tema | Decisão | Motivo |
|---|---|---|
| Versionamento | Nome de branch livre. A aplicação inteira (backend, front e docs) sobe de uma vez, no fim; commits locais por passo servem só como ponto de retorno | Decisão Q3 (seção 7) |
| Rotas futuras | Todas as rotas da spec entram já na Fase 0; as que ainda não existem apontam para um stub "Em construção" e ficam fora da navbar, das abas e dos links "ver todos" até existirem | URLs funcionam desde o começo (o mesmo papel dos 501 na Fase 0 do backend), e a demo não mostra nada pela metade |
| Dados das abas | O layout (Partida, Jogador, Time) e as abas chamam `useApi` com o mesmo caminho; o cache devolve a mesma resposta sem nova requisição | Cada aba fica independente do layout, sem passar dados por contexto |
| Cancelamento | Resultado que chega depois de desmontar ou de mudar os parâmetros é **descartado**, sem abortar a requisição | A requisição é compartilhada pelo cache e serve à próxima visita; abortar quebraria quem espera a mesma `Promise`. A spec (5.1) foi ajustada |
| Estados | Componente `Estado` com *render prop*: `<Estado resposta={r}>{dados => …}</Estado>` cuida de carregando, erro e vazio | Tira o mesmo `if` de todas as páginas |
| Backend fora do ar | Enquanto `/api/saude` falhar, o layout tenta de novo a cada 5 s; quando o backend volta, o aviso some sozinho | O backend leva ~4 s para subir; na demo, ninguém precisa recarregar a página |
| Filtros e histórico | Mudar filtro, aba, ordenação ou corte cria uma entrada no histórico (`setSearchParams` sem `replace`) | O botão voltar desfaz a última mudança |
| Chave do cache | `urlApi` ordena as chaves dos parâmetros | `?mapa=X&torneio=Y` e `?torneio=Y&mapa=X` viram a mesma entrada |
| Links | `linkJogador(puuid)`, `linkTime(id)`, `linkPartida(id)`, `linkAnalise(id)`, `linkMapa(mapa)` em `formatos.js`. Até o passo 3.4, `linkTime(id)` aponta para `/partidas?time=<id>` | Um lugar só para as rotas (os puuids têm ~78 caracteres e são fáceis de errar). Antes da página do Time, o clique num time mostra as partidas dele; quando ela existir, a troca é uma linha |
| Linhas clicáveis | Link de verdade na célula principal; as outras células têm uma cópia do link fora da ordem do Tab (`tabIndex=-1`, `aria-hidden`), exceto as que já têm links próprios. Nada de `onClick` no `<tr>` | Funciona com teclado (uma parada por linha), botão do meio e "abrir em nova aba". Um link estendido à linha por CSS não serve: a primeira coluna é sticky, e uma célula sticky prende o link estendido dentro dela |
| Cabeçalho fixo | Só gruda em tabelas com `alturaMax` (rolagem vertical própria), usada nas tabelas longas | Dentro de um bloco com rolagem horizontal, `position: sticky; top` se prende a esse bloco, não à página |
| Datas | `formatarData` corta a string `AAAA-MM-DD`; **nunca** `new Date("2026-09-27")` | Essa string é lida como meia-noite UTC: em UTC−3 o dia vira 26/09 |
| Números | Instâncias de `Intl.NumberFormat("pt-BR")` criadas uma vez por formato | Consistente e barato em tabelas de 400 linhas |
| Gráficos | `graficos/comum.js` com as props de eixo, grade e tooltip do tema escuro, usadas por todos os tipos | O recharts vem com cores de tema claro; um ajuste vale para todos |
| CSS | `index.css` com tokens e estilos base (tabela, card, chip, botão, foco); cada componente importa o próprio `.css`. O `App.css` é reescrito para o layout novo | Mantém o padrão atual do `vava/` (BEM, sem CSS Modules). Todo o `App.css` atual é do layout antigo |
| Responsividade | Construída junto com cada componente, não no fim: grades com `auto-fit`, tabelas com rolagem própria, controles que empilham (spec 6.6). Cada passo é conferido em 1920, 1366×768 e 1024×768 | Decisão Q2 e F6. Deixar para o fim obrigaria a refazer layouts prontos |
| Equipe A/B | `equipe(partida, timeId)` → `"a"` ou `"b"`, que escolhe `--time-a`/`--time-b` | Não confundir com `lado` (ataque/defesa), que nunca é colorido na Partida (F12) |
| Testes | Sem testes automatizados de UI. Cada checkpoint passa a parte do roteiro da spec (§10) que já existe, mais `npm run lint` e `npm run build` | O critério da spec; o tempo vai para as páginas |

## 3. Contratos internos (fixados na Fase 0)

### 3.1 Rotas (`main.jsx`)

Todas ficam dentro do layout `App` (`<Outlet/>`). A coluna "Fase" diz quando o stub vira página.

| Rota | Componente | Fase |
|---|---|---|
| `/` | `pages/Home` | 2 |
| `/ranking`, `/ranking/times` | `pages/ranking/Ranking` + abas `Jogadores` e `Times` (a aba vem da rota) | 2 (jogadores), 3 (times) |
| `/partidas` | `pages/Partidas` | 1 |
| `/partidas/:id` + `rounds`, `heatmap`, `duelos` | `pages/partida/Partida` (layout) + uma página por aba | 2 (placar, rounds), 3 |
| `/jogadores/:puuid` + `partidas`, `agentes`, `mapas`, `armas`, `heatmap` | `pages/jogador/Jogador` + abas | 2 (resumo, partidas), 3 |
| `/times/:id` + `elenco`, `mapas`, `partidas`, `confrontos`, `heatmap` | `pages/time/Time` + abas | 3 |
| `/analises`, `/analises/:id` | `pages/Analises`, `pages/Analise` | 2 |
| `/mapas`, `/mapas/:mapa` | `pages/Mapas`, `pages/Mapa` | 3 |
| `*` | `pages/NaoEncontrado` | 0 |

### 3.2 Módulos

```js
// api.js
urlApi(caminho, params = {})        // "/api/<caminho>?…": chaves ordenadas, arrays repetidos, vazios omitidos
buscar(caminho, params)             // Promise<json>; cache Map url → Promise; erro lança ErroApi {status, mensagem} e sai do cache
useApi(caminho, params)             // { dados, erro, carregando }; caminho null → não busca
foraDoAr(erro)                      // true para falha de rede (status 0), 502, 503 e 504 (F10)

// filtros.js
FILTROS = ["torneio", "fase", "mapa", "time", "agente", "funcao"]
useFiltros()                        // { filtros, setFiltro(nome, valor | null), limpar() }; trocar o torneio limpa fase inválida
useParametro(nome, padrao)          // [valor, setValor] para ordenar, ordem, min_rounds, min_partidas, tipo, lado, categoria, metrica

// formatos.js: tudo o que transforma um dado da API em texto, cor ou link
ROTULOS, rotulo(coluna)             // spec 5.4 (F17)
formatar(coluna, valor)             // por nome de coluna; null → "—"
corQualidade(coluna, valor)         // "bom" | "ruim" | null, pelos limiares da spec 6.3 (F16)
formatarData(iso, { curta }), dividirNick(nick) → { nome, tag }
linkJogador, linkTime, linkPartida, linkAnalise, linkMapa
equipe(partida, timeId)             // "a" | "b"

// constants.js
MAP_IMAGES (já existe), RESULTADOS (ícone + rótulo), CERIMONIAS, LADOS (rótulo + ícone)
CATEGORIAS (rótulos das abas de Análises), CORES_SERIE (F13), RAMPA_CALOR (F14)
```

### 3.3 Componentes

| Componente | Props | Observação |
|---|---|---|
| `Estado` | `resposta` (de `useApi`), `vazio?(dados)`, `esqueleto?` (`"tabela"`, `"grafico"`, `"bloco"`), `children(dados)` | `foraDoAr` → mensagem do backend; 404 → `NaoEncontrado` |
| `Tabela` | `linhas`, `colunas: [{chave, rotulo?, formato?, cor?, link?, alinhar?}]`, `ordenacao?: {coluna, ordem}`, `onOrdenar?` | Sem `onOrdenar`, ordena no cliente. `cor: true` aplica `corQualidade`; `link(linha)` vira o link da linha |
| `StatTile` | `coluna`, `valor`, `rotulo?`, `legenda?` | Formata e colore pela coluna |
| `Abas` | `itens: [{rotulo, para}]`, ou `parametro` + `itens: [{rotulo, valor}]` | `NavLink` nas rotas; query string nas Análises |
| `BarraFiltros` | `campos` (subconjunto de `FILTROS`), `children?` (campos extras no começo da linha) | Opções de `/api/filtros`; "Limpar filtros" limpa só os `campos` |
| `LinhaPartida` | `partida` (formato `Partida`), `timeId?` | Destaca o time quando recebe `timeId` |
| `Nick`, `NomeTime`, `SeloAgente`, `AvisoAmostra` | `puuid` + `nick`; `id` + `nome` + `equipe?`; `agente`; `n` (dentro do card do item) ou `itens: [{nome, n}]` (lista) | |
| `Busca` | `grande?` | Debounce de 250 ms, teclado (spec 7.9) |
| `BarraRounds` | `rounds`, `partida`, `compacta?`, `selecionado?`, `onSelecionar?` | |
| `MapaCalor` | `mapa`, `pontos: [x, y][]`, `total?` | Rampa da F14 |
| `PainelHeatmap` | `mapas`, `filtro?` (`{jogador}` ou `{time}`), `tipos?` (kills, mortes, plants), `campos?` (filtros comuns) | Chips de mapa (só com 2+), tipo, lado e `BarraFiltros` em volta do `MapaCalor`; abas Heatmap do Jogador e do Time e explorador do Mapa |
| `IconeArma` | `meio`, `categoria?`, `comNome?` | Silhueta de `/armas/<nome>.png`; habilidade (Ability) ou arquivo que falhar vira texto. `SeloAgente` usa `/agentes/<nome>.png` e volta às iniciais |
| `BarraLados` | `atk` (% de rounds do ataque) | Barra ataque \| defesa com a marca dos 50% e os dois números escritos; Mapas e Mapa |
| `GraficoAnalise` | `analise` (resposta de `/api/analises/{id}`), `altura?` | Escolhe o gráfico por `grafico.tipo` (spec 8) |
| `Histograma` | `faixas` (resposta de `/distribuicao`), `metrica` | |
| `MatrizDuelos`, `GrafoDuelos` | `duelos` (resposta de `/duelos`), `partida` | |

### 3.4 O que o front deriva

O front não calcula métrica nenhuma. As únicas derivações são estas:

| Derivação | Como | Onde |
|---|---|---|
| Lado de um abate | `time_atacante_id` do round em `/rounds` igual ao `time_id` de quem age → ataque | Partida › Heatmap e kill feed |
| Loadout de cada time por round | `time_atacante_id === timeA ? loadout_atk : loadout_def` | Partida › Rounds (economia) |
| Matriz de duelos | Orientar cada aresta pelo `time_id` dos nós: linha = time A, coluna = time B | Partida › Duelos |
| Abas de Análises | Categorias distintas de `/api/analises`, na ordem em que aparecem | Análises |

## 4. Fases

As estimativas são em horas de uma pessoa e não têm folga. Ao fim da Fase 1, compare o tempo real com o
estimado e refaça os cortes da seção 5.

### Fase 0: Fundação (≈ 3,5 h)

1. **Limpeza** (F7): sair `DropZone`, `Sidebar`, `MatchCard`, `HeatmapView` (ele usa o `extractKillData`),
   `utils.js`, `assets/maps/calibration.json` e `src/assets/`. As regras `.heatmap-map-*` e `.heatmap-canvas`
   do `App.css` vão para `components/MapaCalor.css`, e o resto do `App.css` sai. O `MatchGraph.jsx` fica até a
   Fase 3. `index.html` com `lang="pt-BR"` e título "VAVA Stats"; `package.json` com `name: "vava-stats"`; o
   README do template vira um ponteiro para `docs/frontend/`.
2. **Dependências** (F8) e **fonte** (F9).
3. **Tokens e estilos base** em `index.css` (F12): tokens novos, `--text-muted` corrigido, tabela, card,
   chip, botão e foco visível; contêiner de até 1440 px e as faixas de largura da spec 6.6.
4. **Rotas** (3.1) com stubs; **layout** `App` (navbar com links, espaço da busca e menu abaixo de 1024 px,
   rodapé com o `/saude`, aviso de backend fora do ar); `NaoEncontrado`.
5. **Módulos** `api.js`, `filtros.js`, `formatos.js` e `constants.js` (3.2).

- **Pronto quando:**
  - `npm run dev` mostra a navbar, toda rota da spec abre (stub ou página) e uma rota inventada dá 404;
  - F5 numa rota profunda funciona;
  - a navbar vira menu abaixo de 1024 px, e nada vaza da tela em 1024×768;
  - com o backend desligado aparece o aviso, que some sozinho ao subir o backend;
  - no console do navegador, `(await import("/src/formatos.js")).formatar("kast_pct", 74.24)` dá `"74,2%"` e
    `formatarData("2026-09-27")` dá `"27/09/2026"`;
  - `npm run lint` e `npm run build` passam.

### Fase 1: Partidas (≈ 2 h)

1. `Estado`, `Nick` e `NomeTime`.
2. `BarraFiltros`, com a fase dependente do torneio (F5).
3. `LinhaPartida`.
4. **Página Partidas** (spec 7.3): filtros de torneio, fase, mapa e time, e "carregar mais" de 30 em 30.

`Tabela`, `Abas`, `StatTile` e `SeloAgente` nascem no passo 2.1 (Placar); `AvisoAmostra`, no 2.4 (Análises).

- **Pronto quando:** 336 partidas sem filtro e 36 com `?time=ufmt_turuna`; F5 mantém os filtros e o botão
  voltar restaura a lista anterior; em 1024×768, a lista e os filtros cabem sem rolagem horizontal da página.

**✔ Checkpoint 1:** a fundação está validada numa página real.

### Fase 2: P0 na ordem da demo (≈ 15,5 h)

| Passo | Entrega | Spec | Estimativa |
|---|---|---|---|
| 2.1 | `Tabela`, `Abas`, `StatTile` e `SeloAgente` + Partida: layout (banner, abas) e Placar (duas tabelas, MVP, linha do time) | 7.4 | 3,5 h |
| 2.2 | Jogador: layout (cabeçalho, tiles) + Resumo (evolução, top agentes, mapas e armas) + Partidas | 7.5 | 2,5 h |
| 2.3 | Home + `Busca` (navbar e versão grande) | 7.1, 7.9 | 2 h |
| 2.4 | `AvisoAmostra` + Análises: abas por categoria, cards, tela cheia (`/analises/:id`, destino dos KPIs da Home) e `GraficoAnalise` com barras, linha, kpi, tabela e matriz (cores F13 e F15) | 7.7, 8 | 3 h |
| 2.5 | Ranking de jogadores: chips de mapa, filtros, `min_rounds`, ordenação no servidor, "mostrar todos" | 7.2 | 1,5 h |
| 2.6 | Partida › Rounds: `BarraRounds` (completa, e a compacta que também entra no Placar), detalhe do round, kill feed do round e gráfico de economia | 7.4 | 3 h |

- Cada passo é conferido nas larguras de checkpoint (1920, 1366×768 e 1024×768) antes do próximo.

- A `dispersao` fica para a Fase 3: nenhuma análise atual usa, e até lá ela cai na `Tabela` pela regra do
  tipo desconhecido.
- O Placar fica sem a barra compacta até o passo 2.6.
- **Pronto quando:** as linhas de P0 do roteiro da spec (§10) passam. Home com 336 / 411 / 68 / 6.618 /
  46.371 e KPIs 51,8%, 86,5%, 75,5% e 61,9%; `/ranking` com lule#dfnt em 1º (TORONTO#lulu com
  `min_rounds=50`); a partida de exemplo com 14 rounds e Flawless nos rounds 2, 4 e 14; as 9 análises nas 5
  abas; `/jogadores/nao-existe` dá "Não encontrado". O caminho da demo (Home → busca → jogador → partida →
  análise) funciona só com cliques.

**✔ Checkpoint 2:** P0 completa. A P1 só começa daqui.

### Fase 3: P1 (≈ 13 h)

O passo 3.1 vem primeiro, porque o `MapaCalor` serve aos passos 3.3, 3.4 e 3.6. Os demais podem ir em
qualquer ordem.

| Passo | Entrega | Spec | Estimativa |
|---|---|---|---|
| 3.1 | `MapaCalor` (rampa da F14) + Partida › Heatmap (filtros no cliente, lado via `/rounds`, kill feed). Mapa limitado pela altura da tela e canvas com `devicePixelRatio`. Uma versão mínima de `/mapas/:mapa` (só o mapa de kills, fora da navbar) serve para medir o pior caso, kills em Ascent sem filtro (11.621 pontos): acima de 200 ms, aplicar o "carimbo" da spec §9 | 7.4, 9 | 2,5 h |
| 3.2 | Partida › Duelos: `MatrizDuelos` + `GrafoDuelos` (adaptado do `MatchGraph`, que então sai) | 7.4 | 2 h |
| 3.3 | Jogador › Agentes, Mapas (cards), Armas e Heatmap | 7.5 | 1,5 h |
| 3.4 | Time: cabeçalho + Visão geral, Elenco, Mapas, Partidas, Confrontos e Heatmap; `linkTime` passa a apontar para `/times/<id>` | 7.6 | 2,5 h |
| 3.5 | Ranking › Times + `Histograma` da distribuição | 7.2 | 1 h |
| 3.6 | Mapas: grade e página do mapa (explorador de heatmap, análises filtradas, top 10) | 7.8 | 2 h |
| 3.7 | "Ver dados" na análise em tela cheia + `Dispersao` | 7.7, 8 | 0,5 h |
| 3.8 | Ícones (F4): `scripts/baixar_icones.py` + `SeloAgente` com imagem | 6.4 | 1 h |

- **Pronto quando:** o roteiro da spec (§10) passa inteiro. Duelos com 10 jogadores e 25 duelos;
  `/mapas/Ascent` com 1.049 plants; `/ranking/times` com 34 times; o perfil de TORONTO#lulu mostra "fora do
  ranking".

**✔ Checkpoint 3:** P1 completa.

### Fase 4: Fechamento e envio (≈ 2,5 h)

- Roteiro completo da spec (§10) numa sessão limpa: backend reiniciado e aba nova (cache vazio).
- Passada de responsividade nas larguras do fechamento: 2560, 1280×720, 768 e 390 (spec 6.6).
- `npm run lint`, `npm run build` e `npm run preview` (porta 4173). O preview herda o proxy `/api` do dev
  server, então o build final é testado com a API real, inclusive abrindo direto uma rota profunda.
- Docs: status da spec → "implementada"; registrar na spec qualquer decisão ou formato que mudou durante a
  implementação; README com o comando do front.
- **Envio único** (Q3): com `.venv/bin/pytest backend/tests`, `npm run lint` e `npm run build` passando, a
  aplicação inteira (backend, front e docs) sobe de uma vez. O `dist/` e o `node_modules/` já estão no
  `.gitignore` do `vava/`.

**✔ Checkpoint 4:** aplicação inteira enviada e pronta para a demo.

## 5. Cortes se o prazo apertar

O prazo do hackathon ainda não foi definido (D2 do backend). Os cortes abaixo seguem a ordem da seção 4, e
cada um é uma demo completa:

| Corte | Inclui | Horas acumuladas | O que a demo mostra |
|---|---|---|---|
| A: demo mínima | Fases 0 e 1 + passos 2.1 a 2.4 | ≈ 16,5 h | Home com KPIs e busca, partidas, placar, perfil do jogador e as 9 análises |
| B: P0 completa | + passos 2.5 e 2.6 | ≈ 21 h | + ranking e round a round |
| C: P0 + heatmap | + passos 3.1 e 3.2 | ≈ 25,5 h | + heatmap e duelos da partida, o visual mais forte |
| D: P1 completa | + passos 3.3 a 3.8 | ≈ 34 h | tudo da spec, menos a P2 |

Some 2,5 h da Fase 4 a qualquer corte. Todos os cortes já são responsivos. Regras:

- Só começar um passo se der para terminá-lo. Se a hora do envio chegar com um passo pela metade, o trabalho
  volta ao último commit e a página sai dos menus. (O stub "Em construção" foi removido na T3.6a, quando a
  última rota sem página, `/mapas`, ganhou a sua.)
- Se a demo valorizar o visual, o passo 3.1 (heatmap) pode vir antes do 2.6 (rounds): os dois são
  independentes.

## 6. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Escopo grande para uma pessoa (P0 + P1 ≈ 36,5 h) | Ordem por valor de demo, cortes da seção 5 e recalibração ao fim da Fase 1 |
| Tabelas largas, barra de rounds e gráficos em telas estreitas | Rolagem dentro do bloco, primeira coluna fixa e barras horizontais com muitas categorias (spec 6.6) |
| Telas baixas (1366×768, 1280×720) cortando o heatmap | Mapa quadrado limitado pela altura da tela (spec 9) |
| Heatmap borrado em telas de alta densidade | Canvas com `devicePixelRatio` até 2 (spec 9) |
| Datas um dia antes do certo | `formatarData` trabalha com a string, sem `Date` (seção 2) |
| Heatmap lento com 11.621 pontos | Medir no passo 3.1; "carimbo" com `drawImage` (spec §9) |
| react-router 8 é recente | Usar só as APIs conferidas na F8: `createBrowserRouter`, `RouterProvider`, `NavLink`, `Outlet`, `useParams`, `useSearchParams` |
| recharts no tema escuro | Props comuns em `graficos/comum.js` com as cores dos tokens |
| Nicks longos ou com caracteres especiais (`gubert 水#SEP`, `AIM Yasuzinn ツ#carol`) quebram tabelas | Reticências com o nick completo no `title`; `tabular-nums` só nos números |
| A API mudar de formato | A seção 8 da spec do backend é o contrato; qualquer mudança atualiza as duas specs no mesmo PR |
| Demo sem internet | Fonte, minimapas e ícones são locais (F4, F9); só a API local é necessária |

## 7. Decisões do plano

| # | Decisão | Situação |
|---|---|---|
| Q1 | Prazo do hackathon (é a D2 do backend) | **Em aberto.** Define o corte da seção 5; até lá, a meta é o corte B, e o C se sobrar tempo |
| Q2 | Em que telas a aplicação roda | **Decidido (21/10/2026):** em computadores de tamanhos diferentes. O front é responsivo desde a P0 (F6 revista, spec 6.6), o que soma ~7 h às estimativas |
| Q3 | Fluxo de git | **Decidido (21/10/2026):** nome de branch livre e envio único da aplicação inteira no fim, sem PR por fase (seção 2 e Fase 4) |

## 8. Fora deste plano

- A P2 da spec: multisseleção nos filtros, séries (MD3) agrupadas, modo "pontos" no heatmap e exportar CSV.
- Os ajustes de backend da spec §11 (F11), inclusive corrigir a seção 8 da spec do backend.
- Testes automatizados de interface e deploy.
