# Tasks — Frontend do dashboard (VAVA Stats)

> Implementa o [plan.md](plan.md) a partir da [spec.md](spec.md). Marque `[x]` ao concluir.
> Uma pessoa, em sequência; a aplicação inteira sobe de uma vez no fim (plano, Q3).
> **Em aberto:** Q1, o prazo do hackathon, que escolhe o corte (plano, seção 5).

**Como ler cada tarefa:** *Arquivos* = o que a tarefa cria ou altera (caminhos relativos a `apps/web/`, salvo
indicação) · *Depende* = só quando não basta a tarefa anterior · *Aceite* = como provar que terminou. As
estimativas somam as horas do plano.

**Vale para toda tarefa com tela** (critério de pronto da spec, §10), sem repetir em cada uma: funciona com
dados reais e abre direto pela URL; tem estados de carregando, erro e vazio; filtros e aba ficam na URL; o
console fica sem erros; e a página passa nas larguras de checkpoint (1920, 1366×768 e 1024×768) sem rolagem
horizontal da página.

**Numeração:** T0.n e T1.n seguem os itens das Fases 0 e 1 do plano. Da Fase 2 em diante, `T2.1a` é a
tarefa a do passo 2.1. Ao terminar uma página, troque o stub da rota dela em `main.jsx`.

**Dados de conferência** (medidos em 21/10/2026, com o corte de 100 rounds):

- **Partida A**: `69e7e59f-f9e2-4127-9e76-4ca85c045c0a`, Wolf Gaming 13 × 1 Minerva Thunders, em Haven
  (27/09/2026). É o exemplo da spec.
- **Partida B**: `8340be3e-3943-44a5-b1d4-5994eb0752fa`, Ufrj Minerva 6 × 13 Pucc Cardinals, em Abyss
  (12/09/2026). Tem 136 registros de abate, entre eles 6 quedas e 1 morte para a spike.
- **Jogadores**: lule#dfnt (1º do ranking) e TORONTO#lulu (56 rounds, fora do ranking). Antes da busca
  existir, o perfil abre pelo console:
  `location.href = "/jogadores/" + (await (await fetch("/api/busca?q=lule")).json())[0].id`.
- **Time**: `azure_bears_golden`.

## Visão geral

| Fase | Tarefas | Estimativa | Cortes (plano, seção 5) |
|---|---|---|---|
| 0. Fundação | T0.1–T0.7 | 3,5 h | todos |
| 1. Partidas | T1.1–T1.5 | 2 h | todos |
| 2. P0 | T2.1a–T2.6c | 15,5 h | A termina na T2.4d; B, na T2.6c |
| 3. P1 | T3.1a–T3.8b | 13 h | C termina na T3.2b; D, na T3.8b |
| 4. Fechamento e envio | T4.1–T4.4 | 2,5 h | todos |

```
Fase 0   T0.1 → T0.2 → T0.3 → T0.4 → T0.5 → T0.6 → T0.7
Fase 1   T1.1 → T1.2 → T1.3 → T1.4 → T1.5
Fase 2   2.1 → 2.2 → 2.3 → 2.4                               ← fim do corte A
         2.5 → 2.6                                           ← fim do corte B
Fase 3   3.1 → 3.2                                           ← fim do corte C
         3.3 · 3.4 · 3.5 · 3.6 · 3.7 · 3.8, em qualquer ordem  ← fim do corte D
Fase 4   T4.1 → T4.2 → T4.3 → T4.4, depois de qualquer corte
```

---

## Fase 0: Fundação (≈ 3,5 h)

- [x] **T0.1 Limpeza do `apps/web/`** · 20 min · F7
  - *Arquivos:* saem `src/components/DropZone.jsx`, `Sidebar.jsx`, `MatchCard.jsx` e `HeatmapView.jsx`,
    `src/utils.js`, `assets/maps/calibration.json` e `src/assets/`. Cria `src/components/MapaCalor.css` com as
    regras `.heatmap-map-*` e `.heatmap-canvas` tiradas do `App.css`, que fica vazio. `App.jsx` provisório (só o
    título). `index.html` com `lang="pt-BR"` e título "VAVA Stats"; `package.json` com `"name": "vava-stats"`;
    o `README.md` do `apps/web/` vira um ponteiro para `docs/frontend/`.
  - *Aceite:* `grep -rn "extractKillData\|parseFilename\|readFileAsJSON\|DropZone" src` não acha nada;
    `HeatmapCanvas.jsx` e `MatchGraph.jsx` continuam; `npm run build` passa.

- [x] **T0.2 Dependências e fonte** · 10 min · F8, F9
  - *Arquivos:* `package.json`, `package-lock.json`, `src/main.jsx` (`import "@fontsource-variable/inter"`),
    `src/index.css` (`--font: 'Inter Variable', system-ui, sans-serif`; o pacote registra a família com esse nome).
  - Comando: `npm install react-router@8 recharts@3 lucide-react@1 @fontsource-variable/inter@5 react-is@19.3.1`.
    O `react-is` vai explícito porque, sem ele, o npm usa a 16.13.1 trazida pelo `prop-types` do
    `react-force-graph-2d`.
  - *Aceite:* `npm ls react-router recharts lucide-react @fontsource-variable/inter react-is` mostra 8.x, 3.x,
    1.x, 5.x e `react-is` 19.x; no DevTools (Computed → Rendered fonts), o texto usa "Inter Variable", também
    com a rede em modo Offline.

- [x] **T0.3 Tokens e estilos base** · 40 min · F12, spec 6.2 e 6.6
  - *Arquivos:* `src/index.css`.
  - Tokens da spec 6.2: `--text-muted` (#8a8aa3), `--time-a`, `--time-b`, `--atk`, `--def`, `--bom`, `--ruim`,
    `--neutro`, `--serie-1` a `--serie-8` e `--outros`; mais `--largura-max: 1440px` e respiro lateral fluido
    (`clamp(12px, 3vw, 32px)`).
  - Estilos base: `.card`, `.chip` e `.chip--ativo`, botões, `:focus-visible`, `.rolagem-x` (bloco com
    rolagem horizontal própria) e `.numero` (`tabular-nums`); alvos de 44 px com `@media (pointer: coarse)`.
  - *Aceite:* os tokens têm os valores da spec; uma página provisória com um card, chips e uma linha de
    números não rola na horizontal em 390 px; o foco do teclado aparece em links e botões.

- [x] **T0.4 Rotas, layout e 404** · 45 min · plano 3.1, spec 6.1
  - *Arquivos:* `src/main.jsx` (`createBrowserRouter` + `RouterProvider`, com todas as rotas do plano 3.1),
    `src/App.jsx` + `App.css` (navbar, `<Outlet/>`, rodapé), `src/components/Navbar.jsx` + `.css`,
    `src/pages/EmConstrucao.jsx`, `src/pages/NaoEncontrado.jsx`.
  - Navbar com o logo (link para `/`), os links Ranking, Partidas e Análises (Mapas entra na T3.6a) e o espaço
    da busca (T2.3a). Abaixo de 1024 px, os links vão para um menu aberto por botão.
  - *Aceite:* `/times/azure_bears_golden/elenco` mostra "Em construção"; `/xyz` mostra o 404 com link para a
    Home; F5 em `/jogadores/abc/partidas` funciona; o link da página atual fica destacado; em 768 px o menu
    abre e fecha com mouse e com teclado.

- [x] **T0.5 `api.js` e aviso de backend fora do ar** · 35 min · spec 5.1, F10, plano 2
  - *Arquivos:* `src/api.js` (`urlApi`, `buscar`, `useApi`, `foraDoAr`, `ErroApi`); `src/App.jsx` (aviso e
    rodapé com o `/saude`).
  - *Aceite:*
    - no console, `(await import("/src/api.js")).urlApi("jogadores", { torneio: "Univavá", mapa: ["Ascent", "Haven"], fase: null })`
      devolve `"/api/jogadores?mapa=Ascent&mapa=Haven&torneio=Univav%C3%A1"`;
    - duas chamadas seguidas a `buscar("filtros")` geram uma só requisição (aba Network);
    - `buscar("partidas/xyz")` rejeita com `status: 404` e `mensagem: "Partida não encontrada"`, e a chamada
      seguinte tenta de novo;
    - com o backend desligado aparece o aviso com o comando; ao religar, ele some em até 5 s, sem recarregar;
    - o rodapé mostra "336 partidas · dados carregados em …".

- [x] **T0.6 `filtros.js`** · 25 min · spec 5.2, F5
  - *Arquivos:* `src/filtros.js` (`FILTROS`, `useFiltros`, `useParametro`).
  - Mudar um filtro cria uma entrada no histórico; trocar o torneio remove a fase que não pertence a ele
    (consulta `/api/filtros`).
  - *Aceite:* `npm run lint` passa; o comportamento é conferido na T1.3, a primeira usuária.

- [x] **T0.7 `formatos.js` e `constants.js`** · 35 min · spec 5.4 e 6.3, F13, F14, F16, F17
  - *Arquivos:* `src/formatos.js` (`ROTULOS` copiado da spec 5.4, `rotulo`, `formatar`, `corQualidade` com os
    limiares da spec 6.3, `formatarData`, `dividirNick`, os links e `equipe`); `src/constants.js` (`RESULTADOS`,
    `CERIMONIAS`, `LADOS`, `CATEGORIAS`, `CORES_SERIE` e `RAMPA_CALOR`, mantendo `MAP_IMAGES`).
  - `linkTime(id)` aponta para `/partidas?time=<id>` até a T3.4c.
  - *Aceite* (no console):

    ```js
    const f = await import("/src/formatos.js")
    f.formatar("kast_pct", 74.24)        // "74,2%"
    f.formatar("kd", 1.678)              // "1,68"
    f.formatar("acs", 287.3)             // "287"
    f.formatar("mais_menos", -3)         // "−3"   (e +37 → "+37")
    f.formatar("loadout_atk", 4100)      // "4.100"
    f.formatar("tempo_s", 64.2)          // "1:04"
    f.formatar("kd", null)               // "—"
    f.formatarData("2026-09-27")         // "27/09/2026", também com o sistema em UTC−3
    f.rotulo("compra_atk")               // "Compra ATK"   (e "nova_coluna" → "Nova coluna")
    f.corQualidade("acs", 230)           // "bom"   (170 → "ruim"; 200 → null)
    f.dividirNick("gubert 水#SEP")       // { nome: "gubert 水", tag: "SEP" }
    f.linkTime("ufmt_turuna")            // "/partidas?time=ufmt_turuna"
    ```

**✔ Checkpoint 0:** o "Pronto quando" da Fase 0 no plano.

---

## Fase 1: Partidas (≈ 2 h)

- [x] **T1.1 `Estado`** · 25 min · spec 6.5, plano 3.3
  - *Arquivos:* `src/components/Estado.jsx` + `.css`.
  - Esqueletos `tabela`, `grafico` e `bloco`; erro com "tentar de novo"; `foraDoAr` → mensagem do backend;
    404 → `NaoEncontrado`; vazio → texto ("Nada encontrado para estes filtros." por padrão).
  - *Aceite:* conferido na T1.5: com o backend desligado, a página mostra a mensagem; depois de religar,
    "tentar de novo" carrega a lista.

- [x] **T1.2 `Nick` e `NomeTime`** · 15 min · spec 5.4, F12
  - *Arquivos:* `src/components/Nick.jsx` e `NomeTime.jsx` (+ `.css`).
  - `Nick`: nome em destaque, `#tag` apagado, link `linkJogador` e reticências com o nick inteiro no `title`.
    `NomeTime`: link `linkTime` e, com `equipe`, um marcador na cor `--time-a`/`--time-b` (o nome fica na cor do
    texto).
  - *Aceite:* conferido na T1.5, no MVP e nos times de cada partida.

- [x] **T1.3 `BarraFiltros`** · 30 min · spec 5.2, F5
  - *Arquivos:* `src/components/BarraFiltros.jsx` + `.css`.
  - Um select por item de `campos`, com as opções de `/api/filtros`, e "limpar filtros"; quebra em linhas em
    telas estreitas.
  - *Aceite* (na T1.5): o torneio "Rush Series Esquenta" deixa só a fase de mesmo nome no select; partindo
    de `?torneio=Univavá&fase=Fase de Grupos`, trocar o torneio remove a fase da URL; voltar no navegador
    desfaz a troca.

- [x] **T1.4 `LinhaPartida`** · 30 min · spec 6.4 e 7.3
  - *Arquivos:* `src/components/LinhaPartida.jsx` + `.css`.
  - Miniatura do mapa, data, torneio · fase · `codigo`, time A placar × placar time B (vencedor em destaque),
    MVP (nick e ACS) e duração. Com `timeId`, destaca o time e mostra V ou D. Em tela estreita, quebra em duas
    linhas.
  - *Aceite:* conferido na T1.5.

- [x] **T1.5 Página Partidas** · 20 min · spec 7.3
  - *Arquivos:* `src/pages/Partidas.jsx` + `.css`.
  - Filtros de torneio, fase, mapa e time; 30 partidas por vez e "carregar mais"; mais recentes primeiro.
  - *Aceite:* "336 partidas" sem filtro; a primeira é a Partida A, com MVP bielmonster#prime (ACS 379);
    `?time=ufmt_turuna` → 36 partidas; e os aceites das T1.1 a T1.4.

**✔ Checkpoint 1:** o "Pronto quando" da Fase 1 no plano.

---

## Fase 2: P0 na ordem da demo (≈ 15,5 h)

### Passo 2.1: Partida › Placar (3,5 h)

- [x] **T2.1a `Tabela`** · 75 min · spec 6.4 e 6.6, plano 3.3
  - *Arquivos:* `src/components/Tabela.jsx` + `.css`.
  - Colunas declarativas (`chave`, `rotulo`, `formato`, `cor`, `link`, `alinhar`), com rótulo padrão
    `rotulo(chave)` e valor padrão `formatar(chave, valor)`. Ordenação no cliente (o clique alterna
    decrescente e crescente, nulos por último) ou via `onOrdenar`. `cor: true` aplica `--bom`/`--ruim`. Linha
    clicável sem `onClick` no `<tr>`: link de verdade na célula da coluna com `link` e cópias fora do Tab nas
    outras (exceto colunas com `interativo: true`), porque a primeira coluna é sticky (plano, seção 2).
    Primeira coluna fixa, rolagem própria, cabeçalho fixo com `alturaMax` e densidade compacta abaixo de 1024 px.
  - *Aceite:* conferido na T2.1d.

- [x] **T2.1b `Abas`, `StatTile` e `SeloAgente`** · 30 min · spec 6.4, F4
  - *Arquivos:* `src/components/Abas.jsx`, `StatTile.jsx` e `SeloAgente.jsx` (+ `.css`).
  - `Abas` com `NavLink` (rotas) ou com um parâmetro da URL; em tela estreita, as abas rolam na horizontal.
    `StatTile` formata e colore pela coluna. `SeloAgente` mostra as iniciais num selo neutro, com o nome do
    agente no `title`.
  - *Aceite:* conferido nas T2.1c e T2.1d.

- [x] **T2.1c Partida: layout e cabeçalho** · 50 min · spec 7.4
  - *Arquivos:* `src/pages/partida/Partida.jsx` + `.css`.
  - Banner com a imagem do mapa esmaecida; torneio · fase · código · data · mapa · rounds · duração; os dois
    times com placar (vencedor em destaque e marcador de equipe) e a linha "ATK · DEF · pistols" de cada um;
    abas Placar e Rounds (Heatmap e Duelos entram na Fase 3). Abaixo de 768 px, um time embaixo do outro.
  - *Aceite:* a Partida A mostra "Univavá · Fase de Grupos · 032b · 27/09/2026 · Haven · 14 rounds · 22 min",
    Wolf Gaming 13 × 1 Minerva Thunders, "ATK 2 · DEF 11 · pistols 2" e "ATK 1 · DEF 0 · pistols 0";
    `/partidas/xyz` mostra "Não encontrado".

- [x] **T2.1d Partida › Placar** · 55 min · spec 7.4 e 6.3
  - *Arquivos:* `src/pages/partida/Placar.jsx` + `.css`.
  - Uma `Tabela` por time, ordenada por ACS: Jogador (selo + nick), K, D, A, +/−, ACS, ADR, KAST, HS%, FK, FD
    e MK, com cor por qualidade; selo de MVP; resumo do time (rounds de ataque e de defesa, pistols e first
    kills).
  - *Aceite:* na Partida A, a tabela de Wolf Gaming começa por bielmonster#prime (Neon), 21/7/4, +14, ACS
    379, ADR 229, KAST 85,7% e HS 27,8%, com o selo de MVP; ACS, ADR, KAST e +/− em verde, HS% sem cor;
    clicar no cabeçalho ACS inverte a ordem; em 1024×768 a tabela cabe ou rola dentro do bloco, com o nick
    fixo; o nick leva ao perfil.

### Passo 2.2: Jogador (2,5 h)

- [x] **T2.2a Jogador: layout e cabeçalho** · 50 min · spec 7.5
  - *Arquivos:* `src/pages/jogador/Jogador.jsx` + `.css`.
  - Nick, nicks anteriores, times (com o nº de partidas), agente e função principais e "#N no ranking" (ou
    "fora do ranking, menos de 100 rounds"). Tiles ACS, K/D, ADR, KAST, HS%, Win%, FK/R e +/− em grade
    `auto-fit`. Abas Resumo e Partidas (as demais entram nas T3.3a e T3.3b).
  - *Aceite:* lule#dfnt mostra "#1 no ranking", Macklogic Red (7) e Macklogic Rainbow (5), Sova
    (Iniciador), 12 partidas e 221 rounds, e os tiles ACS 287, K/D 1,68, ADR 188, KAST 81,0%, HS 30,7%, Win
    91,7%, FK/R 0,23 e +91; TORONTO#lulu mostra "fora do ranking"; `/jogadores/nao-existe` mostra "Não
    encontrado".

- [x] **T2.2b Jogador › Resumo** · 70 min · spec 7.5, plano 2
  - *Arquivos:* `src/pages/jogador/Resumo.jsx` + `.css`; `src/graficos/comum.js` (props de eixo, grade e
    tooltip do tema escuro, usadas por todos os gráficos daqui em diante).
  - Gráfico de evolução: uma linha por partida, em ordem de data, com seletor ACS/ADR/K/D/KAST; o ponto é
    cheio e `--bom` na vitória, vazado e `--ruim` na derrota. Top 3 agentes, top 3 mapas e top 5 armas, cada
    bloco com "ver tudo" (escondido até a aba existir).
  - *Aceite:* lule#dfnt tem 12 pontos na evolução; agentes Sova (6), Jett (5) e Fade (1); mapas Ascent (5),
    Haven (4) e Split (2); armas Phantom 33,9%, Vandal 21,9% e Ghost 8,9% no topo; trocar a métrica muda o eixo
    e o tooltip.

- [x] **T2.2c Jogador › Partidas** · 30 min · spec 7.5
  - *Arquivos:* `src/pages/jogador/Partidas.jsx`.
  - `Tabela` com data, mapa, time, adversário, placar, V/D, agente, K, D, A, +/−, ACS, ADR, KAST, HS%, FK e
    MK; a linha abre a partida.
  - *Aceite:* lule#dfnt tem 12 linhas, mais recentes primeiro; clicar numa linha abre a partida certa.

### Passo 2.3: Home e busca (2 h)

- [x] **T2.3a `Busca`** · 50 min · spec 7.9
  - *Arquivos:* `src/components/Busca.jsx` + `.css`; `Navbar.jsx` passa a usar a busca.
  - Debounce de 250 ms, mínimo de 2 caracteres e até 10 resultados, com ícone de tipo, nome e detalhe. ↑/↓
    navegam, Enter abre o selecionado (ou o primeiro) e Esc fecha. Versão `grande` para a Home; em tela
    estreita, a lista ocupa a largura toda.
  - *Aceite:* "lule" → lule#dfnt, e Enter abre o perfil; "ceub" → Ceub Octopus Vulgaris e Ceub Octopus (o
    link do time abre as partidas dele até a T3.4c); "stars" → Usp Stars e Usp Stars Gc; digitar "a" não gera
    requisição (aba Network).

- [x] **T2.3b Home** · 70 min · spec 7.1
  - *Arquivos:* `src/pages/Home.jsx` + `.css`.
  - Título, busca grande e contadores; 4 cards de KPI com link para `/analises/<id>` (vira página na T2.4d);
    últimas partidas (`LinhaPartida`), top 5 jogadores e top 5 times. Duas colunas a partir de 1280 px, uma
    abaixo disso. "Ver ranking de times" fica escondido até a T3.5b.
  - *Aceite:* contadores 336 / 411 / 68 / 6.618 / 46.371; KPIs 51,8%, 86,5%, 75,5% e 61,9%; 8 partidas, a
    primeira é a Partida A; top jogadores lule#dfnt (287), gubert 水#SEP (284), llenn#TTS (282), AIM Yasuzinn
    ツ#carol (275) e Kato#lau (275); top times Ceub Octopus (9-0), Macklogic Red (10-1), Ufu Saints (14-4), Axis
    Anteaters (10-3) e Azure Bears Golden (24-8).

### Passo 2.4: Análises (3 h)

- [x] **T2.4a `GraficoAnalise`: barras, linha, kpi e tabela** · 75 min · spec 8, F13
  - *Arquivos:* `src/graficos/GraficoAnalise.jsx` (objeto `GRAFICOS`), `Barras.jsx`, `Linha.jsx` e `Kpis.jsx`
    (+ `.css`), com as props de `graficos/comum.js`.
  - Barras: `x`, `y`, `serie`, `referencia` (linha tracejada) e rótulos; horizontais com mais de 8 categorias;
    cores da F13 (série única = cor 1; por categoria, até 3 cores de `CORES_SERIE` e o resto em "Outros";
    `serie` com muitos valores vira seletor no card). Linha com `referencia`. Kpis: um card por linha. Tabela:
    a `Tabela` com `grafico.colunas`. Tipo desconhecido → `Tabela` com todas as colunas. Os valores da coluna
    `metrica` passam pelo `ROTULOS`.
  - *Aceite:* conferido na T2.4c.

- [x] **T2.4b `Matriz`** · 35 min · spec 8, F15
  - *Arquivos:* `src/graficos/Matriz.jsx` + `.css`.
  - Grade com `grafico.ordem` nos dois eixos (linhas = `y`, colunas = `x`). A cor é `color-mix(in oklab, …)`
    entre `--def`, `--neutro` e `--atk`, com no máximo 50% do polo. Célula com `n < min_n`: fundo `--surface2` e
    "n < 30". Rótulos nos eixos; rola dentro do bloco em tela estreita.
  - *Aceite:* `compras` vira uma grade 5 × 5 com 16 células preenchidas e 9 vazias; 5 células têm "n < 30"
    (ataque × defesa: Eco × Eco, Eco × Full buy, Semi-eco × Eco, Semi-eco × Semi-eco e Semi-buy × Semi-eco);
    Full buy × Full buy fica em 49,5%, quase neutra.

- [x] **T2.4c Página Análises** · 45 min · spec 7.7 e 6.5
  - *Arquivos:* `src/pages/Analises.jsx` + `.css`; `src/components/AvisoAmostra.jsx` + `.css`.
  - Abas por categoria (da lista `/api/analises`, rótulos de `CATEGORIAS`, em `?categoria=`); `BarraFiltros`
    com os 6 filtros; card com título, insight, gráfico, descrição recolhível e link "abrir". Linhas com menos
    de 5 partidas ficam esmaecidas, com o `AvisoAmostra`.
  - *Aceite:*
    - 5 abas (Mapas, Momentos decisivos, Economia, Meta e Jogadores) e 14 análises atuais;
    - `lado-por-mapa`: 10 barras com linha em 50%, Ascent em 47,3%, e Pearl (3) e Fracture (2) com aviso;
    - `first-kill`: Ataque 75,5% e Defesa 67,8%; `pistol`: cards de 89,3%, 83,5% e 86,5%;
    - `meta-armas`: 28 barras horizontais, Rifle, Sidearm e Sniper coloridas e as outras 7 categorias em
      "Outros";
    - `metricas-vitoria`: "KAST" em 1º (r 0,59); `plant-sites`: seletor de mapa;
    - `?mapa=Ascent` muda os números, e `lado-por-mapa` fica com uma barra.

- [x] **T2.4d Análise em tela cheia** · 25 min · spec 7.7
  - *Arquivos:* `src/pages/Analise.jsx`.
  - O card em largura total, com a `BarraFiltros` e o `kpi` em destaque quando existir. "Ver dados" entra na
    T3.7.
  - *Aceite:* os 4 KPIs da Home abrem a análise certa; `/analises/vantagem-economica` mostra a curva em S com
    9 pontos (de 16,1% a 85,6%) e a linha em 50%; `/analises/xyz` mostra "Não encontrado".

### Passo 2.5: Ranking (1,5 h)

- [x] **T2.5 Ranking de jogadores** · 1,5 h · spec 7.2
  - *Arquivos:* `src/pages/Ranking.jsx` + `.css`.
  - Abas Jogadores e Times (Times escondida até a T3.5b); chips de mapa, que rolam na horizontal em tela
    estreita; `BarraFiltros` (torneio, fase, time, agente, função); seletor de `min_rounds` (50, 100, 150, 200);
    `Tabela` com `onOrdenar` gravando `ordenar` e `ordem` na URL; "mostrar todos" (`limite=1000`). O histograma
    entra na T3.5a.
  - *Aceite:* sem parâmetros, 100 linhas e lule#dfnt em 1º; `min_rounds=50` põe TORONTO#lulu em 1º; ordenar
    por K/D refaz a chamada e a coluna `#` acompanha; "mostrar todos" → 222 linhas; o link copiado reabre a
    mesma visão; em 1024×768 a tabela rola dentro do bloco, com o nick fixo.

### Passo 2.6: Partida › Rounds (3 h)

- [x] **T2.6a `BarraRounds`** · 70 min · spec 7.4, F12
  - *Arquivos:* `src/components/BarraRounds.jsx` + `.css`.
  - Uma coluna por round, com o ícone do `resultado` (`RESULTADOS`) na linha do time vencedor e na cor da
    equipe; divisor entre os rounds 12 e 13 e antes da prorrogação; selo de cerimônia; lado em texto ou
    ícone, nunca em cor. Versão compacta; seleção de round por clique e teclado; rola dentro do bloco quando não
    cabe.
  - *Aceite:* conferido nas T2.6b e T2.6c.

- [x] **T2.6b Partida › Rounds** · 60 min · spec 7.4
  - *Arquivos:* `src/pages/partida/Rounds.jsx` + `.css`.
  - `BarraRounds` completa e o detalhe do round selecionado: quem atacou, compra e loadout de cada lado,
    plant, defuse e first kill. Kill feed do round a partir de `/abates`, com os registros `valido: false`
    como "morreu para a Spike", "queda" ou "teamkill".
  - *Aceite:* na Partida A, 14 rounds, 13 de Wolf Gaming e 1 de Minerva Thunders (o 11), o round 1 com
    defuse e Flawless nos rounds 2, 4 e 14; no round 11, Minerva atacou com Semi-buy (18.400) contra Full buy
    (24.900), plantou no C e sofreu o first kill de bielmonster#prime em swpz#1578 aos 0:11. Na Partida B, o
    kill feed do round 10 mostra a morte de PUCC Tiezo#kuro para a spike e uma queda, e o do round 14 mostra 5
    quedas.

- [x] **T2.6c Economia e barra compacta no Placar** · 50 min · spec 7.4, plano 3.4
  - *Arquivos:* `src/pages/partida/Rounds.jsx`, `src/pages/partida/Placar.jsx`.
  - Gráfico de linha com o loadout de cada time por round, nas cores das equipes; o valor de cada time vem de
    `loadout_atk` ou `loadout_def`, conforme o `time_atacante_id` do round. `BarraRounds` compacta no topo do
    Placar, só para leitura.
  - *Aceite:* na Partida A, o round 11 marca 18.400 para Minerva Thunders e 24.900 para Wolf Gaming; o Placar
    mostra a barra compacta com os mesmos ícones da aba Rounds.

**✔ Checkpoint 2:** P0 completa (corte B): o "Pronto quando" da Fase 2 no plano.

---

## Fase 3: P1 (≈ 13 h)

### Passo 3.1: Heatmap (2,5 h)

- [x] **T3.1a `MapaCalor` e medição do pior caso** · 70 min · spec 9, F14, 6.6
  - *Arquivos:* `src/components/MapaCalor.jsx` + `MapaCalor.css` (criado na T0.1),
    `src/components/HeatmapCanvas.jsx`, `src/pages/Mapa.jsx` (versão mínima).
  - `MapaCalor`: imagem do minimapa, canvas e contador "N eventos", com aviso "poucos eventos" abaixo de 20.
    `heatColor(t)` interpola a `RAMPA_CALOR`, no lugar do arco-íris. Canvas com `devicePixelRatio` até 2; mapa
    quadrado limitado pela altura da tela; ao redimensionar, redesenha no máximo uma vez por quadro.
  - `/mapas/:mapa` mínima: só o mapa de kills (`/api/heatmap?mapa=<mapa>&tipo=kills`), fora da navbar. A
    T3.6b completa a página.
  - *Aceite:* `/mapas/Ascent` mostra 11.621 eventos; o redesenho fica em até 200 ms na aba Performance, ou o
    "carimbo" com `drawImage` foi aplicado (spec 9); em 1366×768 o mapa inteiro cabe sem rolar; com zoom de
    200% no navegador (simula tela de alta densidade), o calor não fica borrado.

- [x] **T3.1b Partida › Heatmap** · 80 min · spec 7.4 e 9, plano 3.4
  - *Arquivos:* `src/pages/partida/Heatmap.jsx` + `.css`; a aba Heatmap passa a aparecer na Partida.
  - Usa `/abates` e `/rounds`, com filtros no cliente: tipo (Kills ou Mortes), time, jogador, metade e lado
    (derivado de `/rounds`). "Kills" ignora `valido: false` e `killer_pos: null`. Kill feed completo ao lado
    do mapa, ou abaixo em tela estreita.
  - *Aceite:* na Partida A, Kills mostra 94 eventos; com o time Minerva Thunders, 26; Mortes + Minerva
    Thunders, 68; com o jogador bielmonster#prime, 21. Na Partida B, Kills mostra 129 (as 7 mortes que não
    são abate ficam de fora) e Mortes, 133.

### Passo 3.2: Duelos (2 h)

- [x] **T3.2a `MatrizDuelos`** · 45 min · spec 7.4, plano 3.4
  - *Arquivos:* `src/components/MatrizDuelos.jsx` + `.css`; `src/pages/partida/Duelos.jsx`; a aba Duelos
    passa a aparecer na Partida.
  - Linhas com os jogadores do time A, colunas com os do time B; célula "kills_a–kills_b" com o fundo na cor
    da equipe que venceu o duelo (e neutro no empate); rola dentro do bloco em tela estreita.
  - *Aceite:* na Partida A, bielmonster#prime × swpz#1578 é 6–1, na cor de Wolf Gaming; a soma das células é
    94.

- [x] **T3.2b `GrafoDuelos`** · 75 min · spec 7.4
  - *Arquivos:* `src/components/GrafoDuelos.jsx` (adaptado do `MatchGraph.jsx`, que sai);
    `src/pages/partida/Duelos.jsx` (alternância Matriz/Grafo).
  - Nós a partir de `nos` (tamanho por `kills`, cor da equipe), arestas a partir de `arestas`; largura e
    altura medidas no contêiner com `ResizeObserver`.
  - *Aceite:* 10 nós e 25 arestas na Partida A; redimensionar a janela redesenha sem distorcer;
    `MatchGraph.jsx` não existe mais e `npm run build` passa.

### Passo 3.3: Jogador, demais abas (1,5 h)

- [x] **T3.3a Jogador › Agentes, Mapas e Armas** · 50 min · spec 7.5
  - *Arquivos:* `src/pages/jogador/Agentes.jsx`, `Mapas.jsx` e `Armas.jsx` (+ `.css`).
  - Agentes: `Tabela` de `por_agente`. Mapas: cards com a imagem do mapa ao fundo, em grade `auto-fit`. Armas:
    barras horizontais de `pct`, agrupadas por `categoria_meio`. Os "ver tudo" do Resumo passam a aparecer.
  - *Aceite:* lule#dfnt: Agentes com Sova, Jett e Fade; Mapas com 4 cards, Ascent (5 partidas) primeiro;
    Armas com Phantom (33,9%) em 1º.

- [x] **T3.3b Jogador › Heatmap** · 40 min · spec 7.5
  - *Arquivos:* `src/pages/jogador/Heatmap.jsx`.
  - *Depende:* T3.1a.
  - `MapaCalor` com `/api/heatmap?mapa=<m>&jogador=<puuid>&tipo=kills|mortes`; o mapa vem de `por_mapa`
    (padrão: o mais jogado); filtros de lado, torneio e fase.
  - *Aceite:* lule#dfnt abre em Ascent com 80 kills; Haven + Kills → 78.

- [x] **Heatmap › Abates e vítimas de habilidade** · Exploração espacial de abates finalizados por Ability
  - *Arquivos:* `components/PainelHeatmap.jsx`, `MapaCalor.jsx` (+ `.css`) e `pages/Mapa.jsx`.
  - Adiciona tipos com posições do killer e da vítima, mantém filtros existentes, informa contagem de
    eventos/partidas, alerta para amostras com menos de 5 partidas e explica que não são coordenadas do cast.
  - *Aceite:* mapa e filtros alteram os pontos e referem-se ao participante correto; pós-plant exige timestamp
    de abate ≥ timestamp do plant.

- [x] **T3.3c Jogador › Armas: abates por alvo** · Perfil individual: participação das habilidades nas baixas
  - *Arquivos:* `src/pages/jogador/Armas.jsx`, `Alvos.jsx` (+ `.css`).
  - A comparação por função ou agente da vítima fica na mesma página das estatísticas de armas e habilidades;
    a antiga rota `/alvos` redireciona para `/armas`.
  - Seletor interativo alterna o alvo; tabela ordenável exibe contagens por arma/habilidade, total do denominador
    e percentual de habilidade com barra comparativa.
  - *Aceite:* os percentuais correspondem a habilidade / (habilidade + arma), e a interface esclarece limites
    da categoria genérica `Ability` e a exclusão de causas ambientais.

### Passo 3.4: Time (2,5 h)

- [x] **T3.4a Time: layout, cabeçalho e Visão geral** · 60 min · spec 7.6
  - *Arquivos:* `src/pages/time/Time.jsx` e `VisaoGeral.jsx` (+ `.css`).
  - Cabeçalho com nome, torneios, campanha, win% e saldo, e tiles de ATK%, DEF% e Pistol%. Visão geral: as 5
    últimas partidas, barras de win% por tipo de compra (com o nº de rounds) e resumo por mapa (cores de
    lado).
  - *Aceite:* `azure_bears_golden` mostra 3 torneios, 24-8, 75,0%, saldo +174, ATK 61,0%, DEF 67,2% e Pistol
    60,9%; Full buy com 71,2% em 389 rounds.

- [x] **T3.4b Time › Elenco, Mapas, Partidas e Confrontos** · 60 min · spec 7.6
  - *Arquivos:* `src/pages/time/Elenco.jsx`, `Mapas.jsx`, `Partidas.jsx` e `Confrontos.jsx`.
  - *Aceite* (`azure_bears_golden`): Elenco com 5 jogadores, greiN#quel em 1º (32 partidas); Mapas com 8 mapas
    e 14 composições, entre elas Astra, Cypher, Jett, Phoenix e Sova em Ascent (8-0); Partidas com 32 e filtros
    de torneio, fase e mapa; Confrontos com 16 adversários, Ceub Octopus Vulgaris em 1º (6 partidas, 5
    vitórias).

- [x] **T3.4c Time › Heatmap e links de time** · 30 min · spec 7.6, plano 2
  - *Arquivos:* `src/pages/time/Heatmap.jsx`; `src/formatos.js` (`linkTime` → `/times/<id>`).
  - *Depende:* T3.1a.
  - *Aceite:* o heatmap usa `/api/heatmap?mapa=<m>&time=<id>`; todo link de time (Home, Partidas, Placar,
    busca) abre a página do time; "ceub" na busca abre Ceub Octopus Vulgaris.

### Passo 3.5: Ranking, complementos (1 h)

- [x] **T3.5a `Histograma`** · 30 min · spec 7.2
  - *Arquivos:* `src/components/Histograma.jsx` + `.css`; `src/pages/Ranking.jsx`.
  - Distribuição da métrica de `ordenar`, com os mesmos filtros e o mesmo `min_rounds`; tooltip com faixa,
    jogadores, % e % acumulado.
  - *Aceite:* sem filtros, 20 faixas somando 222 jogadores; ordenar por K/D troca o histograma para K/D.

- [x] **T3.5b Ranking › Times** · 30 min · spec 7.2, F1
  - *Arquivos:* `src/pages/Ranking.jsx`; `src/pages/Home.jsx` ("ver ranking de times" aparece).
  - `/api/times` com `min_partidas=8` sempre enviado e seletor 0/5/8/10; ordenação no cliente mantendo a
    `posicao` da API.
  - *Aceite:* 34 times, Ceub Octopus (9-0) em 1º; `min_partidas=0` → 68 times.

### Passo 3.6: Mapas (2 h)

- [x] **T3.6a Mapas: grade** · 40 min · spec 7.8
  - *Arquivos:* `src/pages/Mapas.jsx` + `.css`; `Navbar.jsx` (o link Mapas aparece).
  - 10 cards com a imagem do mapa ao fundo (grade `auto-fit`), com partidas e % de rounds do ataque, de
    `/analises/lado-por-mapa`.
  - *Aceite:* 10 cards; Ascent com 86 partidas e 47,3%; Pearl e Fracture com o `AvisoAmostra`.

- [x] **T3.6b Página do mapa** · 80 min · spec 7.8
  - *Arquivos:* `src/pages/Mapa.jsx` + `.css`.
  - *Depende:* T3.1a e T2.4a.
  - Explorador de heatmap: tipo (Kills, Mortes, Plants), lado e `BarraFiltros` (torneio, fase, time, agente,
    função). `plant-sites`, `meta-agentes` e `lado-por-mapa` com `?mapa=<mapa>`, pelo `GraficoAnalise`. Top 10
    jogadores no mapa. Duas colunas a partir de 1280 px.
  - *Aceite:* Ascent com Plants mostra 1.049 pontos, concentrados nos sites A e B; Kills, 11.621; Mortes +
    agente Jett, 2.121; o top 10 começa por andre#aaa12.

### Passo 3.7: Análise, complementos (0,5 h)

- [x] **T3.7 "Ver dados" e `Dispersao`** · 30 min · spec 7.7 e 8, F13
  - *Arquivos:* `src/pages/Analise.jsx`; `src/graficos/Dispersao.jsx`.
  - "Ver dados" alterna o gráfico com uma `Tabela` de todas as colunas de `dados`. `Dispersao`: `x`, `y` e
    `serie`, com até 3 categorias e o resto em "Outros".
  - *Aceite:* em `/analises/meta-agentes`, "ver dados" mostra 160 linhas. Para a dispersão, que nenhuma análise
    usa hoje: criar no backend um `analises/teste_dispersao.py` sem versionar, com `grafico.tipo =
    "dispersao"`; ele aparece em `/analises` sem mudar o front e é desenhado como dispersão; depois apagar o
    arquivo.

### Passo 3.8: Ícones (1 h)

- [x] **T3.8a `apps/web/scripts/baixar_icones.py`** · 35 min · F4 (caminho a partir da raiz do repositório)
  - *Arquivos:* `apps/web/scripts/baixar_icones.py`; `apps/web/public/agentes/` e `apps/web/public/armas/` (gerados e
    versionados).
  - Lê `reference/valorant_reference.json`. Agentes: `https://media.valorant-api.com/agents/<uuid>/displayicon.png`,
    reduzido para 96 × 96 com Pillow (já no `requirements.txt`; o original tem ~570 KB). Armas fora da categoria
    Ability: `https://media.valorant-api.com/weapons/<uuid>/killstreamicon.png`, a silhueta de kill feed. Nome
    do arquivo: o nome em minúsculas, sem acentos nem símbolos (KAY/O → `kayo.png`). Pula o que já existe.
    Roda com `.venv/bin/python apps/web/scripts/baixar_icones.py` e precisa de internet uma vez só.
  - *Aceite:* 29 ícones de agente (Miks incluso) e 21 de arma; `apps/web/public/agentes/` com menos de 1 MB;
    rodar de novo não baixa nada.

- [x] **T3.8b Ícones na interface** · 25 min · F4
  - *Arquivos:* `src/components/SeloAgente.jsx`; o kill feed (T2.6b e T3.1b) e a aba Armas (T3.3a).
  - `SeloAgente` usa `/agentes/<nome>.png` e volta às iniciais se a imagem falhar (`onError`). Kill feed e
    Armas usam `/armas/<nome>.png`, com o nome em texto quando não há ícone (habilidades como Headhunter).
  - *Aceite:* o Placar da Partida A mostra os ícones; com um ícone apagado de propósito, o selo volta às
    iniciais; Headhunter (Chamber) aparece como texto.

**✔ Checkpoint 3:** P1 completa (corte D): o roteiro da spec (§10) passa inteiro.

---

## Fase 4: Fechamento e envio (≈ 2,5 h)

- [x] **T4.1 Roteiro numa sessão limpa** · 45 min · spec 10
  - Backend reiniciado e janela anônima (cache vazio). Passar todas as linhas do roteiro da spec, anotar e
    corrigir o que divergir.
  - *Aceite:* todas as linhas conferem.

- [x] **T4.2 Passada de responsividade** · 50 min · spec 6.6
  - No modo responsivo do DevTools, em 2560, 1280×720, 768 e 390: Home, Ranking, as 4 abas da Partida,
    Jogador, Time, Análises e Mapa.
  - *Aceite:* nada vaza da tela; tabelas, barra de rounds, matriz e chips rolam dentro do próprio bloco; o
    menu da navbar funciona em 768 e 390; o heatmap cabe na tela em 1280×720.

- [x] **T4.3 Documentação** · 20 min
  - *Arquivos:* `docs/frontend/spec.md` (status "implementada" e o que mudou durante a implementação),
    `docs/frontend/plan.md` (status), `README.md` da raiz (comando do front, link para a spec) e o `README.md`
    do `apps/web/`.
  - *Aceite:* quem ler só o README da raiz consegue subir backend e front.

- [x] **T4.4 Envio único** · 35 min · plano Q3
  - `.venv/bin/pytest apps/api/tests` (103 testes), `npm run lint` e `npm run build` passam; `npm run preview`
    (porta 4173) abre direto `/partidas/<Partida A>/rounds` com dados da API.
  - *Aceite:* `git status` não lista `dist/` nem `node_modules/`; a aplicação inteira (backend, front, docs e
    ícones) sobe de uma vez.

**✔ Checkpoint 4:** aplicação inteira enviada e pronta para a demo.
