# Spec — Backend do dashboard (VAVA Stats)

> Status: **implementada** (fases 0–4 concluídas em 21/10/2026) · Ver [plan.md](plan.md) e [tasks.md](tasks.md)
> Decisões em aberto para o time: D1–D5 no [plan.md](plan.md#7-decisões-pendentes-do-time).

## 1. Objetivo

Centralizar tudo o que já foi feito (ETL, métricas, análises da EDA, heatmap e grafo de embates) em uma API
que alimente um dashboard web com o layout do [csstats.gg](https://csstats.gg/pt-BR), trocando CS2 pelos
dados do circuito universitário de Valorant (336 partidas, 411 jogadores, 68 times, 8 torneios/fases).

Restrições do hackathon:

- **Velocidade acima de tudo**: nada de banco, fila, auth ou deploy. Roda local com um comando.
- **Arquitetura simples**: um processo Python, dados em memória, um arquivo por domínio.
- **Extensível**: adicionar uma nova análise = criar **um arquivo**, sem mexer em rotas nem no frontend.

## 2. Do csstats.gg para o nosso dashboard

O frontend vai copiar a navegação e as páginas do csstats. Cada página define o que o backend precisa servir:

| csstats.gg | VAVA Stats | Endpoints |
|---|---|---|
| **Home**: busca, contadores ("251M games processed"), partidas recentes | **Home**: busca, contadores, últimas partidas, top jogadores/times, KPIs da EDA | `/resumo`, `/busca` |
| **Leaderboards**: abas por mapa, distribuição do rating, tabela ranqueada | **Ranking**: abas por mapa/torneio, distribuição de ACS, tabela de jogadores e de times | `/jogadores`, `/jogadores/distribuicao`, `/times` |
| **All Matches**: tabela de partidas | **Partidas**: tabela com filtros (torneio, fase, mapa, time) | `/partidas` |
| **Match**: scoreboard, round a round, kill feed | **Partida**: Placar · Rounds · Heatmap · Duelos | `/partidas/{id}`, `/partidas/{id}/rounds`, `/partidas/{id}/abates`, `/partidas/{id}/duelos` |
| **Player**: resumo, gráficos de evolução, mapas, armas, histórico | **Jogador**: Resumo · Partidas · Agentes · Mapas · Armas · Heatmap | `/jogadores/{puuid}`, `/jogadores/{puuid}/partidas`, `/heatmap` |
| — | **Time** (novo): campanha, elenco, mapas, confrontos | `/times/{id}`, `/times/{id}/partidas` |
| Ban Stats / Tools | **Análises**: meta, economia, lados, momentos decisivos | `/analises`, `/analises/{id}` |

## 3. Escopo

**Dentro:** API REST somente leitura sobre os JSONs de `data/`; métricas agregadas com filtros; detalhes de
partida; heatmaps (por partida, jogador, time e mapa); um registro de análises plugáveis.

**Fora (por enquanto):** login, upload de arquivos, escrita de dados, banco de dados, deploy, paginação
(o volume é pequeno: no máximo ~3,4 mil linhas por consulta de jogadores).

## 4. Arquitetura

```
data/*.json ──► src/valorant_data.py ──► backend/app/dados.py ──► BASE (DataFrames em memória)
                (achata os JSONs)         (limpa, enriquece,           │
                                           calcula índices)            ▼
                                                     routers/*.py  +  analises/*.py  ──►  JSON  ──► vava/ (React)
```

- **Stack**: FastAPI + Uvicorn + pandas. Python já é a linguagem do time e o ETL já existe.
- **Carga na inicialização**: `carregar_tabelas()` leva cerca de 4 s para os 336 arquivos. O backend lê
  `data/` direto e **não depende** dos CSVs do notebook nem do SQLite do `brainstorming/`.
- **Dados em memória**: um objeto global `BASE` com as tabelas. Toda requisição filtra e agrega com pandas.
  Isso basta para esse volume (cerca de 120 mil linhas no total).
- **JSON bruto sob demanda**: features que precisem de algo que não está nas tabelas (por exemplo, posição
  de todos os jogadores no momento de um abate) leem o arquivo da partida com `dados.partida_bruta(match_id)`,
  que usa `lru_cache`.
- **Por que não SQLite/DuckDB**: a lógica de métricas (KAST, first kill, compras) já está em pandas.
  Reescrever em SQL custa tempo sem ganho nesse volume.
- **Por que não JSON estático**: os filtros combinados (torneio × mapa × time × agente) explodem o número
  de arquivos que precisariam ser pré-gerados.

### 4.1 Estrutura de pastas

```
backend/
├── requirements.txt          # fastapi, uvicorn[standard], pandas, numpy, pytest, httpx2
├── app/
│   ├── main.py               # cria o app, CORS, inclui routers, carrega BASE no startup
│   ├── dados.py              # carga + limpeza + enriquecimento → BASE; partida_bruta()
│   ├── filtros.py            # dependência Filtros (query params comuns) + aplicar(df)
│   ├── metricas.py           # agregar(df, chaves) → ACS, ADR, KD, KAST, HS%... para qualquer agrupamento
│   ├── mapas.py              # normalização de coordenadas (calibração oficial) → [0,1]
│   ├── routers/
│   │   ├── geral.py          # /saude, /filtros, /resumo, /busca, /heatmap
│   │   ├── jogadores.py
│   │   ├── times.py
│   │   ├── partidas.py
│   │   └── analises.py       # lista e executa as análises registradas
│   └── analises/
│       ├── __init__.py       # decorator @analise + registro + autoimport dos módulos
│       ├── lado_por_mapa.py
│       └── ...               # um arquivo por análise
├── pytest.ini                # torna `app` importável ao rodar `pytest backend/tests` da raiz
└── tests/
    ├── conftest.py           # TestClient de sessão (carrega BASE uma vez)
    ├── test_smoke.py         # uma chamada por rota + 404s + números de conferência (§9)
    ├── test_dados.py         # consistência dos dados (§5.1) como asserts sobre BASE
    ├── test_nucleo.py        # mapas, dados, filtros e métricas (fase 1)
    ├── test_dominios.py      # routers de jogadores, partidas, times e geral (fase 2)
    └── test_analises.py      # registro e valores de referência das análises (fase 3)
```

Regra de organização: **routers só recebem parâmetros e chamam funções**. Toda a lógica de pandas fica em
`metricas.py`, nas análises ou em funções no topo do próprio router, sem camadas de service/repository.

## 5. Dados em memória (`BASE`)

`dados.py` monta as tabelas abaixo uma única vez. **Toda tabela carrega as colunas da partida** (`match_id`,
`torneio`, `fase`, `data`, `mapa`) para que os filtros funcionem do mesmo jeito em qualquer uma delas.

| Tabela | Grão | Origem / tratamento |
|---|---|---|
| `partidas` | 1 por partida | nova: derivada de `rounds` + nome do arquivo. Colunas: `match_id`, `torneio`, `fase`, `codigo`, `serie_id`, `data`, `mapa`, `time_a`, `time_b`, `placar_a`, `placar_b`, `vencedor`, `n_rounds`, `duracao_min` |
| `jogadores` | jogador × partida | `carregar_tabelas()["jogadores"]` sem observadores; `nick` = nick mais recente do `puuid`; `time_id` |
| `rounds` | round | como hoje + `plant_x`, `plant_y` |
| `economia` | jogador × round | como hoje, com `arma`/`armadura` traduzidas |
| `abates` | abate | como hoje + `killer_x`, `killer_y`, `vitima_x`, `vitima_y`, `time_vitima`, `meio` (arma/habilidade traduzida), `agente_killer` |
| `times` | time | nova: `time_id` (slug), `nome`, `torneios` |
| `calibracao` | mapa | `reference/map_calibration.json` (cópia de `vava/assets/maps/calibration.json`) |

**Identificadores nas URLs**: jogador = `puuid`; time = `time_id`, o slug do nome do arquivo (ex.:
`azure_bears_golden`); partida = `match_id`.

**Mudanças necessárias em `src/valorant_data.py`** (pequenas, aditivas, sem quebrar o notebook):

- `abates`: incluir `victimLocation` e a posição do killer tirada de `playerLocations`.
- `rounds`: incluir `plantLocation` e `bombPlanter` (`planter`).
- Corrigir FK, FD e KAST (R10).

As colunas exatas de cada tabela estão no contrato do [plan.md](plan.md#31-base) (seção 3.1).

As regras de limpeza do notebook (seção "Resumo das adequações") usadas pelo backend são reimplementadas em
`dados.preparar()`: remover observadores, usar o nick mais recente, `""` → nulo, traduzir UUIDs e tratar os
UUIDs de habilidade marcados como `"Weapon"`.

### 5.1 Regras de consistência (validadas em 21/10/2026 nos 336 arquivos)

Estrutura sem falhas: `match_id` único; placar do arquivo = `roundsWon` do JSON; 5×5 jogadores ativos em todas
as partidas; `roundNum` sequencial; lados trocam no round 13; `stats.roundsPlayed` = nº de rounds; todos os
`characterId` e UUIDs de arma mapeados no `reference/`; nenhum código de série com confrontos diferentes.

Regras que `dados.py` precisa aplicar:

| # | Situação nos dados | Regra |
|---|---|---|
| R1 | `abates` inclui 373 "abates" com killer = vítima (spike 327, queda 40, habilidade 5, esmagamento 1) e 9 teamkills. `stats.kills` não os conta. | Coluna `valido` = killer ≠ vítima **e** times diferentes. Métricas, armas e duelos usam só os válidos; com isso a soma bate 3360/3360 com `stats.kills`. O heatmap de mortes pode usar todos. |
| R2 | Red **não** é o time da esquerda do nome do arquivo em 176 de 336 partidas, ao contrário do que diz o README. | Associar Red/Blue ao nome sempre pelo placar, como já faz `_nomes_dos_times`. |
| R3 | Kills por habilidade registradas como `"Weapon"`: Headhunter e Tour de Force (Chamber, 523) e Overdrive (Neon, 207). Já estão no `reference` com `categoria = "Ability"`. As tabelas de agentes e armas do README estão erradas; vale o `reference/valorant_reference.json`. | Separar arma × habilidade pela `categoria` do reference. |
| R4 | 169 kills `"Weapon"` com `damageItem` vazio, todas de Chamber (168 com tiro secundário). | `meio = "Chamber (habilidade)"`. |
| R5 | Posição do killer ausente em 444 abates (373 do R1 + 71 sem snapshot do killer). | `killer_pos = null`; o heatmap de kills ignora esses pontos. |
| R6 | 47 de 97,7 mil pontos ficam fora de `[0,1]` após a calibração. | Descartar no heatmap. |
| R7 | `gameStartMillis` difere da data do arquivo em 3 partidas (fuso UTC). | Usar a data do arquivo. |
| R8 | Amostra pequena: Pearl 3, Breeze 5, Fracture 2 partidas; Bind e Icebox não aparecem. | Toda análise por mapa devolve `n` (partidas/rounds) e o front sinaliza n < 5 partidas. `/filtros` lista só os mapas presentes. |
| R9 | Times com nomes parecidos (`ufg_eagles`/`ufg_eagles_blue`/`ufg_gc_eagles`, `usp_stars`/`usp_stars_gc`…) têm 0 jogadores em comum: são times distintos. Duas orgs mudaram de nome com o mesmo núcleo (Unicamp Tritons Red → Black, Caap Momentum → Malditos). | Identidade do time = slug. O perfil do jogador lista todos os times dele. |
| R10 | Em `_processar_partida`, o first kill e o first death usam o primeiro registro de `kills` do round, e o KAST credita "kill" a quem aparece como killer, ambos sem excluir os registros do R1. Além disso, o registro de quem morre para a spike ou de queda (killer = vítima) casava consigo mesmo no teste de trade, e o jogador contava como "trocado". | FK, FD, trades e crédito de kill do KAST usam só abates válidos; `n_abates` também. **Corrigido (T1.2):** o KAST caiu em 141 jogador × round (138 pelo auto-trade, 2 por trade com teamkill, 1 pelo crédito de kill); o first kill mudou em 8 rounds (em 4 muda o lado); `n_abates` caiu em 256 rounds. |

Calibração de coordenadas: conferida visualmente nos 10 mapas jogados. Com os multiplicadores oficiais os
plants caem nos sites. A calibração empírica antiga de `vava/src/constants.js` não trocava x↔y e foi substituída.

Já corrigido no repositório: R1 (`abates.valido` em `src/valorant_data.py`; o notebook de preparação salva
só os abates válidos), R4 no notebook, R1 no heatmap e no grafo do `vava/`, calibração do `vava/` e as
tabelas do README (agentes, armas, armaduras, Red/Blue e consistência).

## 6. Métricas

Uma única função, `metricas.agregar(jogadores_df, chaves)`, calcula as métricas para **qualquer
agrupamento**: jogador × partida (scoreboard), jogador (ranking), jogador × agente, jogador × mapa, time etc.
Ela **sempre soma antes de dividir**, para ponderar pelos rounds; nunca faz a média de médias.

| Métrica | Fórmula |
|---|---|
| `acs` | Σ score / Σ rounds |
| `adr` | Σ dano / Σ rounds |
| `kd` | Σ kills / Σ deaths |
| `kast_pct` | 100 · Σ kast_rounds / Σ rounds |
| `hs_pct` | 100 · Σ headshots / Σ (headshots + bodyshots + legshots) |
| `kpr`, `dpr`, `apr` | Σ kills, deaths ou assists / Σ rounds |
| `fk_round`, `fd_round` | Σ first_kills ou first_deaths / Σ rounds |
| `win_pct` | 100 · partidas vencidas / partidas |
| `mais_menos` | Σ kills − Σ deaths |

Ordenação padrão do ranking: `acs`. Um "rating" composto, como o HLTV Rating do csstats, fica como questão
em aberto (seção 10).

## 7. Convenções da API

- Prefixo `/api`, apenas `GET`, respostas JSON com nomes em `snake_case` e em português, os mesmos das tabelas.
- `NaN` vira `null`; floats são arredondados para 2 casas, exceto as coordenadas de mapa, que usam 4
  (2 casas equivalem a ~10 px num minimapa de 1024 px).
- Listas voltam como array puro (sem paginação). Endpoints de ranking aceitam `limite`.
- Erros usam o padrão do FastAPI: `404 {"detail": "Jogador não encontrado"}`.
- Coordenadas de mapa sempre normalizadas em `[0, 1]` (x → direita, y → baixo), prontas para desenhar sobre a
  imagem do minimapa. A conversão usa os multiplicadores oficiais da valorant-api, os mesmos dos scripts:
  `x = y_jogo · xMultiplier + xScalarToAdd`, `y = x_jogo · yMultiplier + yScalarToAdd`. Com isso o
  frontend deixa de precisar de calibração própria.
- CORS liberado para `http://localhost:5173`. O Vite também pode usar proxy em `/api`.

### 7.1 Filtros comuns

Aceitos por todos os endpoints de lista e de análise, via a dependência `Filtros`. Cada filtro só é aplicado
se a tabela consultada tiver a coluna correspondente.

| Parâmetro | Exemplo | Coluna |
|---|---|---|
| `torneio` | `Univavá` | `torneio` |
| `fase` | `Fase de Grupos` | `fase` |
| `mapa` | `Ascent` | `mapa` |
| `time` | `azure_bears_golden` | `time_id`, ou ataque/defesa nos rounds |
| `agente` | `Omen` | `agente` |
| `funcao` | `Controlador` | `funcao` |

Todos aceitam múltiplos valores (`?mapa=Ascent&mapa=Haven`). Os parâmetros `min_rounds`, `ordenar`, `ordem` e
`limite` não são filtros: só os endpoints de ranking os aceitam.

## 8. Endpoints

### 8.1 Geral

| Rota | Descrição | Resposta (resumo) |
|---|---|---|
| `GET /api/saude` | healthcheck | `{status, partidas, carregado_em}` |
| `GET /api/filtros` | opções para os dropdowns | `{torneios: [{nome, fases[]}], mapas[], times: [{id, nome}], agentes: [{nome, funcao}], funcoes[]}` |
| `GET /api/resumo` | dados da Home | `{contadores: {partidas, jogadores, times, rounds, abates}, kpis: [{analise_id, titulo, valor, unidade, descricao}], ultimas_partidas: [Partida]×8, top_jogadores: [LinhaRanking]×5, top_times: [LinhaTime]×5}`. `abates` conta só os válidos; `top_times` exige ≥ 8 partidas |
| `GET /api/busca?q=` | busca da navbar (jogador ou time) | `[{tipo: "jogador" \| "time", id, nome, detalhe}]` (até 10, busca por substring sem acento) |
| `GET /api/heatmap` | pontos sobre o mapa | ver 8.6 |

`kpis` da Home vêm do campo `kpi` das análises `lado-por-mapa`, `pistol`, `first-kill` e `meta-armas` (8.5), sem
recalcular nada. São os achados da EDA, calculados ao vivo: % de rounds vencidos pelo ataque (51,8%), % em que
o vencedor do pistol também vence o **round seguinte** (86,5%; nos 2 rounds seguintes cai para 62,9%), win% do
ataque com e sem first kill (75,4% / 32,3%) e % de abates com Vandal ou Phantom.

### 8.2 Jogadores

**`GET /api/jogadores`**: ranking (Leaderboards). Filtros comuns + `ordenar` (qualquer métrica, padrão
`acs`), `ordem` (`desc`), `min_rounds` (padrão 50), `limite` (padrão 100).

```json
[{ "posicao": 1, "puuid": "…", "nick": "Driblas#TTS", "time_id": "unicamp_tritons_red", "time": "Unicamp Tritons Red",
   "partidas": 12, "vitorias": 8, "win_pct": 66.67, "rounds": 260,
   "acs": 231.4, "adr": 152.1, "kd": 1.31, "kast_pct": 74.2, "hs_pct": 24.8,
   "kpr": 0.87, "apr": 0.31, "fk_round": 0.14, "fd_round": 0.09, "multikills": 9,
   "agente_principal": "Jett", "funcao_principal": "Duelista" }]
```

Cada linha também traz `kills`, `deaths`, `assists` e `mais_menos`. `time` e `agente_principal` são os mais
frequentes nas partidas filtradas.

**`GET /api/jogadores/distribuicao?metrica=acs&bins=20`**: histograma, como a distribuição de rating do
csstats. Formato: `[{inicio, fim, jogadores, pct, pct_acumulado}]`.

**`GET /api/jogadores/{puuid}`**: perfil.

```json
{ "puuid": "…", "nick": "…", "nicks_anteriores": ["…"], "times": [{"id": "…", "nome": "…", "partidas": 10}],
  "resumo": { /* mesmas métricas da linha do ranking */ "posicao_ranking": 14 },
  "por_agente": [{ "agente": "Jett", "funcao": "Duelista", "partidas": 6, "win_pct": 50.0, "acs": 240.1, "kd": 1.2 }],
  "por_mapa":   [{ "mapa": "Ascent", "partidas": 4, "win_pct": 75.0, "acs": 228.0, "kd": 1.4 }],
  "armas":      [{ "meio": "Vandal", "categoria_meio": "Rifle", "kills": 81, "pct": 41.3 }],
  "evolucao":   [{ "match_id": "…", "data": "2026-06-27", "mapa": "Haven", "venceu": true, "acs": 182.9, "adr": 128.5, "kd": 0.81, "kast_pct": 73.9 }] }
```

**`GET /api/jogadores/{puuid}/partidas`**: histórico (aba Matches do csstats). Uma linha por partida:
`match_id, data, torneio, fase, mapa, time, adversario, placar_time, placar_adversario, venceu, agente,
kills, deaths, assists, mais_menos, acs, adr, kast_pct, hs_pct, first_kills, multikills`.

### 8.3 Times

**`GET /api/times`**: ranking de times. Filtros comuns + `min_partidas` (padrão 0) e `limite`.
`[{posicao, time_id, nome, partidas, vitorias, derrotas, win_pct, rounds_ganhos, rounds_perdidos, saldo_rounds,
atk_win_pct, def_win_pct, pistol_win_pct}]`, ordenado por `win_pct` e depois por `saldo_rounds`.

**`GET /api/times/{id}`**: perfil do time.

```json
{ "time_id": "…", "nome": "…", "torneios": ["…"], "resumo": { /* linha do ranking */ },
  "elenco":     [ /* LinhaRanking dos jogadores, restrita às partidas do time */ ],
  "por_mapa":   [{ "mapa": "Ascent", "partidas": 3, "win_pct": 66.7, "atk_win_pct": 55.0, "def_win_pct": 48.0 }],
  "composicoes":[{ "mapa": "Ascent", "agentes": ["Jett","Omen","Sova","Killjoy","KAY/O"], "partidas": 2, "win_pct": 100.0 }],
  "confrontos": [{ "adversario_id": "…", "adversario": "…", "partidas": 2, "vitorias": 1 }],
  "economia":   [{ "compra": "Eco", "rounds": 40, "win_pct": 12.5 }] }
```

**`GET /api/times/{id}/partidas`**: lista de partidas do time (formato `Partida`, 8.4).

### 8.4 Partidas

**`GET /api/partidas`**: All Matches. Filtros comuns, ordenadas por data (mais recente primeiro).
`Partida = {match_id, torneio, fase, codigo, serie_id, data, mapa, time_a: {id, nome, placar}, time_b: {id, nome, placar},
vencedor_id, n_rounds, duracao_min, mvp: {puuid, nick, acs}}`

**`GET /api/partidas/{id}`**: cabeçalho e scoreboard (aba Placar).

```json
{ "partida": { /* Partida */ },
  "times": [{ "id": "…", "nome": "…", "placar": 13, "venceu": true,
              "atk_rounds": 7, "def_rounds": 6, "pistols": 1, "first_kills": 14,
              "jogadores": [{ "puuid": "…", "nick": "…", "agente": "Sova", "funcao": "Iniciador",
                              "kills": 13, "deaths": 16, "assists": 8, "mais_menos": -3,
                              "acs": 182.9, "adr": 128.5, "kast_pct": 73.9, "hs_pct": 13.0,
                              "first_kills": 2, "first_deaths": 0, "multikills": 2 }] }] }
```

**`GET /api/partidas/{id}/rounds`**: round a round (barra de rounds e economia do csstats).
`[{round, metade, pistol, time_atacante_id, time_defensor_id, vencedor_id, lado_vencedor, resultado, ceremonia,
houve_plant, plant_site, houve_defuse, compra_atk, compra_def, loadout_atk, loadout_def,
first_kill: {killer: {puuid, nick, time_id}, vitima: {puuid, nick, time_id}, tempo_s} | null}]`

**`GET /api/partidas/{id}/abates`**: kill feed e heatmap da partida. Devolve todos os abates; o frontend
filtra por round, time ou jogador sem nova requisição.
`{mapa, abates: [{round, tempo_s, valido, killer: {puuid, nick, time_id}, vitima: {puuid, nick, time_id}, meio, categoria_meio, assistencias,
killer_pos: {x, y} | null, vitima_pos: {x, y}}]}`. Inclui os registros com `valido: false` (spike, queda,
teamkill, R1) para o kill feed; o heatmap de kills da partida deve ignorá-los.

**`GET /api/partidas/{id}/duelos`**: grafo de embates. A lógica de `MatchGraph.jsx` passa para o backend.
`{nos: [{id: puuid, nick, time_id, agente, kills}], arestas: [{a, b, kills_a, kills_b, total}]}` (só abates válidos)

### 8.5 Análises (o ponto de extensão)

Cada análise é uma função Python registrada com um decorator. A API lista e executa as análises de forma
genérica, e o frontend tem **um componente** que renderiza qualquer uma pelo campo `grafico.tipo`.

```python
# backend/app/analises/lado_por_mapa.py
from app.analises import analise

@analise(
    id="lado-por-mapa",
    titulo="Ataque ou defesa: quem vence em cada mapa?",
    categoria="mapas",                      # agrupa as abas da página Análises
    grafico={"tipo": "barras", "x": "mapa", "y": "atk_win_pct", "rotulo_y": "% rounds vencidos pelo ataque"},
)
def lado_por_mapa(base, filtros):
    r = filtros.aplicar(base.rounds)
    df = (r.assign(atk=r.lado_vencedor.eq("Attacker"))
            .groupby("mapa").agg(rounds=("atk", "size"), atk_win_pct=("atk", "mean")))
    df["atk_win_pct"] *= 100
    return {"dados": df.reset_index(), "insight": f"O ataque vence {r.lado_vencedor.eq('Attacker').mean():.1%} dos rounds."}
```

- `analises/__init__.py` importa automaticamente todos os módulos da pasta (`pkgutil`). **Criar o arquivo é o
  suficiente** para a análise aparecer na API e no dashboard.
- **`GET /api/analises`**: `[{id, titulo, descricao, categoria, grafico}]`
- **`GET /api/analises/{id}`** + filtros comuns: `{id, titulo, descricao, categoria, grafico, dados: [...], insight, kpi}`
- `kpi` (opcional): `{titulo, valor, unidade, descricao}`. As análises usadas na Home (8.1) precisam devolvê-lo.
- Tipos de gráfico suportados: `barras`, `linha`, `dispersao`, `tabela`, `matriz` (heatmap 2D) e `kpi`.
  O campo `grafico` diz quais colunas de `dados` vão em cada eixo:

  | Campo | Uso |
  |---|---|
  | `tipo` | obrigatório |
  | `x`, `y` | colunas dos eixos (no `kpi`: rótulo e valor de cada card) |
  | `serie` | coluna que define a cor/grupo |
  | `rotulo_x`, `rotulo_y` | títulos dos eixos |
  | `referencia` | linha de referência no eixo y (ex.: 50 para "equilíbrio") |
  | `valor`, `n`, `ordem`, `min_n` | `matriz`: coluna da cor, coluna da amostra, ordem das categorias e amostra mínima para exibir o valor |
  | `colunas` | `tabela`: colunas na ordem de exibição |

- Categorias usadas hoje (abas da página Análises): `mapas`, `momentos`, `economia`, `meta`, `jogadores`.

**Como criar uma análise nova** (nenhum outro arquivo muda):

1. Criar `backend/app/analises/<nome>.py` com uma função decorada por `@analise(...)`, como no exemplo acima.
2. Aplicar os filtros com `filtros.aplicar(df)`; na tabela `rounds`, usar `col_time=TIMES_ROUND`.
3. Retornar `vazio()` quando os filtros não deixarem dados, e `n` (rounds/partidas) em cada linha (R8).
4. Opcional: `kpi(titulo, valor, descricao)` para virar card; para aparecer na Home, incluir o id em
   `KPIS_HOME` (`routers/geral.py`).
5. Adicionar o valor de referência em `tests/test_analises.py`.

Análises iniciais, portadas da seção 10 da EDA:

| id | Pergunta | Gráfico |
|---|---|---|
| `lado-por-mapa` | Ataque ou defesa é favorecido em cada mapa? (KPI) | barras |
| `first-kill` | Quanto vale abrir o round com um abate? (KPI) | barras |
| `pistol` | Quem vence o pistol converte o round seguinte? (KPI) | kpi |
| `vantagem-economica` | Win% do ataque por diferença de loadout (curva em S) | linha |
| `compras` | Win% do ataque por tipo de compra (ataque × defesa) | matriz |
| `meta-armas` | Quais armas mais matam? (KPI) | barras |
| `meta-agentes` | Pick rate e win rate por agente e mapa | tabela |
| `metricas-vitoria` | Qual métrica individual mais se associa à vitória? | barras |
| `plant-sites` | Onde a spike é plantada em cada mapa? | barras |

### 8.6 Heatmap

**`GET /api/heatmap`**: um único endpoint para os heatmaps de mapa, jogador, time e partida.

| Parâmetro | Valores |
|---|---|
| `mapa` | obrigatório e único: é o filtro comum `mapa`, que aqui precisa de exatamente um valor (as coordenadas só são comparáveis dentro do mesmo mapa) |
| `tipo` | `kills` (posição do killer), `mortes` (posição da vítima), `plants` |
| `jogador` | `puuid` (opcional) |
| `lado` | `Attacker`/`Defender` (opcional) |
| + filtros comuns | `torneio`, `fase`, `mapa`, `time`, `agente`, `funcao` |

Os filtros de pessoa (`jogador`, `time`, `agente`, `funcao`, `lado`) se referem a quem **faz** a ação do `tipo`:
o killer em `kills`, a vítima em `mortes` e quem plantou em `plants`. Exemplo: `tipo=mortes&agente=Jett` mostra
onde os Jetts morreram.

Resposta: `{mapa, tipo, total, pontos: [{x, y}]}`, com `x, y ∈ [0, 1]`. A imagem do minimapa continua
como asset do frontend (`vava/public/maps/<mapa>.png`).

## 9. Execução e qualidade

```sh
uv pip install --python .venv/bin/python -r backend/requirements.txt
.venv/bin/uvicorn app.main:app --reload --app-dir backend --port 8000   # da raiz do repositório
# docs interativas: http://localhost:8000/docs
.venv/bin/pytest backend/tests
```

- **Critério de pronto de um endpoint**: responde em menos de 300 ms localmente, aparece no `/docs` e tem
  uma linha no `test_smoke.py`. O teste `test_smoke_cobre_todas_as_rotas` compara a lista de `ROTAS` com o
  OpenAPI: uma rota nova sem linha no smoke test falha a suíte.
- **Conferência dos números**: os valores agregados batem com a EDA. O smoke test valida, com tolerância:
  ataque vence 51,8% dos rounds; pistol → round seguinte 86,5%; Σ kills válidos = Σ `stats.kills`.
- **Estado em 21/10/2026**: 103 testes passam em ~8 s; startup de ~4,4 s; todas as rotas abaixo de 140 ms
  (mediana de 5 chamadas, servidor local). Não foi preciso o cache em pickle (plano §6).

## 10. Questões em aberto

1. **Rating composto**: criamos um "VAVA Rating" (por exemplo, combinação de KAST, ADR, KPR e FK) para ser
   o número principal do ranking, como o HLTV Rating no csstats, ou ficamos com ACS? *Sugestão: começar com
   ACS e adicionar o rating como análise depois.* Ver também D4 (corte mínimo de rounds) no [plan.md](plan.md#7-decisões-pendentes-do-time).
2. ~~**Identidade dos times**~~: resolvido pela validação (R9). O slug identifica o time.
3. **Futuro**: clutches (1vX), trades, "jogou com" (aba Played With do csstats), comparação de jogadores e
   o visualizador de visão no abate (`scripts/teste_mapa_visao_kills.py`). Todos cabem no padrão
   "nova análise" ou em um endpoint novo no router do domínio.
