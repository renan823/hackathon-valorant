# Plano — Backend do dashboard (VAVA Stats)

> Implementa a [spec.md](spec.md). Tarefas em [tasks.md](tasks.md). **Status: fases 0–4 concluídas** (21/10/2026);
> ficam em aberto as decisões D1–D5 (seção 7).
> Ambiente: Python 3.12 · pandas 3.0 · `.venv` na raiz · `uv` instalado.

## 1. Estratégia

O caminho crítico é **dados → métricas → endpoints**. Todos os routers dependem de `BASE` e de
`metricas.agregar()`. Por isso:

1. **Fase 0** entrega o esqueleto completo: todos os arquivos existem como stubs e todos os routers já estão
   registrados no `main.py`. Daí em diante cada pessoa mexe só nos próprios arquivos, sem conflito de merge.
2. **Fase 1** fecha o núcleo (`dados`, `filtros`, `metricas`, `mapas`). Os **contratos de coluna** (seção 3)
   ficam definidos já no começo, para que os routers possam ser escritos em paralelo enquanto o núcleo é
   terminado.
3. **Fases 2 e 3** rodam em paralelo: domínios (jogadores, times, partidas, geral) e análises.
4. **Fase 4** fecha os testes e confere os números contra a EDA.

O frontend não espera o backend terminar. Os exemplos JSON da spec são o contrato e o `/docs` do FastAPI
fica disponível desde a Fase 0.

```
Fase 0 ─► Fase 1 ─┬─► Fase 2 (domínios) ─┬─► Fase 4 (testes)
 esqueleto  núcleo └─► Fase 3 (análises) ─┘
```

## 2. Decisões de implementação

| Tema | Decisão | Motivo |
|---|---|---|
| Carga de dados | `lifespan` do FastAPI chama `dados.carregar()`, que preenche o global `BASE` (cerca de 5 s) | Simples. Com `--reload`, cada alteração recarrega em ~5 s, o que é aceitável. Se incomodar, usar cache em pickle (seção 6) |
| Import do ETL | `dados.py` insere `RAIZ/"src"` no `sys.path` e importa `valorant_data` | Reaproveita o ETL sem empacotar |
| Respostas | Funções retornam `dict`/`list` passados por `registros()`, **sem** modelos Pydantic | Velocidade. O `/docs` mostra os parâmetros e a spec documenta as respostas |
| Serialização | `para_json(obj)` em `dados.py`, recursiva: aceita DataFrame, Series, dict, list, escalares numpy e Timestamp. Arredonda floats para 2 casas, `NaN` → `None` e datas → `"AAAA-MM-DD"`. **Todo** retorno de endpoint passa por ela | O FastAPI não serializa `numpy.int64` nem `numpy.bool` (ex.: `df.kills.sum()`). Nos DataFrames, `df.astype(object).where(df.notna(), None)` já devolve tipos Python (testado no pandas 3.0) |
| Heatmap | `/heatmap` monta uma "visão" com colunas genéricas (`puuid`, `time_id`, `agente`, `funcao`, `lado`, `x`, `y`) conforme o `tipo`: `kills` → killer; `mortes` → vítima; `plants` → planter. Depois aplica `Filtros` sem caso especial | Os filtros de abates mudam de sentido conforme o tipo; renomear antes evita lógica condicional no `Filtros` |
| Busca | Comparação em minúsculas e sem acento via `unicodedata.normalize("NFKD", …)` | Sem dependência extra |
| Filtros | Classe `Filtros` usada via `Depends()`. O método `aplicar(df)` só filtra as colunas que existem no `df` | Um ponto único e os mesmos parâmetros em todos os endpoints |
| Métricas | `agregar(df, chaves)` soma e depois divide (spec, seção 6) | Uma fórmula para scoreboard, ranking, perfis e times |
| Análises | Decorator `@analise` + `pkgutil` importando a pasta `analises/` | Nova análise = um arquivo |
| IDs de time | `time_id = nome.lower().replace(" ", "_")`, o inverso de `_formatar_time` | Recupera o slug original do arquivo |
| Calibração | Copiar `vava/assets/maps/calibration.json` para `reference/map_calibration.json` | O backend não depende da pasta do front. A cópia do `vava` sai quando o front passar a usar `/heatmap` |
| Coordenadas | O ETL guarda as coordenadas cruas do jogo; `mapas.normalizar()` converte para `[0,1]` em `dados.preparar()` | Uma única conversão, feita na carga |
| CORS e proxy | CORS para `localhost:5173` e `server.proxy['/api']` no `vite.config.js` | O front chama `/api/...` sem configurar a URL |
| Testes | `pytest` com `TestClient(app)` em fixture de sessão (carrega `BASE` uma vez) | Smoke test rápido de todos os endpoints |

## 3. Contratos internos (fixados na Fase 1)

### 3.1 `BASE`

```python
@dataclass
class Base:
    partidas: pd.DataFrame   # 1 linha por partida
    jogadores: pd.DataFrame  # jogador × partida (sem observadores)
    rounds: pd.DataFrame
    economia: pd.DataFrame
    abates: pd.DataFrame     # todos os registros, com coluna `valido` (R1)
    times: pd.DataFrame
    carregado_em: datetime

BASE: Base | None = None     # preenchido no startup
def base() -> Base           # routers usam dados.base(); falha clara se a carga não rodou
```

Colunas garantidas, além das que o ETL já produz:

| Tabela | Colunas que os routers podem usar |
|---|---|
| todas | `match_id`, `torneio`, `fase`, `data`, `mapa` |
| `partidas` | `codigo`, `serie_id`, `time_a_id`, `time_a`, `placar_a`, `time_b_id`, `time_b`, `placar_b`, `vencedor_id`, `n_rounds`, `duracao_min` |
| `jogadores` | `puuid`, `nick` (o mais recente), `time_id`, `time`, `adversario_id`, `agente`, `funcao`, `venceu`, mais as somas: `score`, `rounds_jogados`, `kills`, `deaths`, `assists`, `dano`, `headshots`, `bodyshots`, `legshots`, `first_kills`, `first_deaths`, `kast_rounds`, `multikills` |
| `rounds` | `round`, `time_atacante_id`, `time_defensor_id`, `vencedor_id`, `lado_vencedor`, `pistol`, `compra_atk`, `compra_def`, `loadout_atk`, `loadout_def`, `houve_plant`, `houve_defuse`, `plant_site`, `planter`, `agente_planter`, `funcao_planter`, `plant_x`, `plant_y` (normalizados), `first_kill_atacante` |
| `abates` | `round`, `tempo_round_s`, `killer`, `vitima`, `valido`, `killer_time_id`, `vitima_time_id`, `lado_killer`, `lado_vitima`, `meio`, `categoria_meio`, `agente_killer`, `funcao_killer`, `agente_vitima`, `funcao_vitima`, `n_assistencias`, `killer_x`, `killer_y`, `vitima_x`, `vitima_y` (normalizados; `None` quando ausente ou fora de `[0,1]`) |
| `times` | `time_id`, `nome`, `torneios` (lista) |
| `economia` | como o ETL produz, com `arma` e `armadura` traduzidas. **Nenhum endpoint inicial usa**; fica carregada para análises futuras |

`posicao_ranking` no perfil do jogador é a posição no ranking global, com os parâmetros padrão
(`acs`, `min_rounds=50`). É `null` quando o jogador não atinge o mínimo de rounds.

### 3.2 Assinaturas do núcleo

```python
# filtros.py
class Filtros:
    def __init__(self, torneio: list[str] | None = Query(None), fase: ..., mapa: ..., time: ...,
                 agente: ..., funcao: ...): ...
    def aplicar(self, df, col_time="time_id") -> pd.DataFrame
        # col_time pode ser uma tupla, ex.: ("time_atacante_id", "time_defensor_id"), e aí vale OU
    # min_rounds, ordenar, ordem e limite NÃO são filtros: são parâmetros só dos endpoints de ranking

# dados.py
def para_json(obj, casas=2) -> dict | list | int | float | str | bool | None   # casas=4 para coordenadas

# metricas.py
SOMAS = ["score", "rounds_jogados", "kills", "deaths", "assists", "dano", "headshots", "bodyshots",
         "legshots", "first_kills", "first_deaths", "kast_rounds", "multikills"]
def agregar(jogadores: pd.DataFrame, chaves: list[str]) -> pd.DataFrame
    # devolve as chaves + partidas, vitorias, rounds + acs, adr, kd, kast_pct, hs_pct, kpr, dpr, apr,
    #   fk_round, fd_round, win_pct, mais_menos
def ranking(df, ordenar="acs", ordem="desc", min_rounds=0, limite=None) -> pd.DataFrame  # + coluna posicao

# mapas.py
def normalizar(mapa: str, x: pd.Series, y: pd.Series) -> tuple[pd.Series, pd.Series]

# analises/__init__.py
def analise(id, titulo, categoria, grafico, descricao=""): ...   # decorator
REGISTRO: dict[str, dict]                                       # id → {meta..., "funcao": f}
# assinatura de cada análise: f(base: Base, filtros: Filtros) -> {"dados": DataFrame | list, "insight": str | None}
```

## 4. Fases

### Fase 0: Esqueleto (≈ 1 h · 1 pessoa · bloqueia as outras)

- `backend/requirements.txt`, estrutura de pastas da spec (seção 4.1) com stubs que levantam `NotImplementedError`.
- `main.py` com `lifespan`, CORS, todos os routers incluídos sob `/api` e o `/api/saude` funcionando.
- Proxy no `vite.config.js`. Comando de execução documentado no README.
- **Pronto quando:** `uvicorn` sobe e o `/docs` lista todas as rotas da spec, mesmo que ainda devolvam 501.

### Fase 1: Núcleo de dados (≈ 3 h · 1–2 pessoas)

1. **ETL** (`src/valorant_data.py`):
   - Colunas novas: `vitima_x`, `vitima_y`, `killer_x`, `killer_y` em `abates`; `plant_x`, `plant_y` e
     `planter` (`bombPlanter`) em `rounds`.
   - Correção (spec, R10): first kill, first death e o crédito de kill do KAST passam a usar só os abates
     válidos. Hoje o first kill sai errado em 11 rounds e o KAST é creditado indevidamente em até 139
     jogador × round.
   - Depois, reexecutar os dois notebooks. Os números de FK e KAST mudam pouco, e os textos da EDA
     precisam ser conferidos.
2. **`mapas.py`**: carregar a calibração e implementar `normalizar()`, descartando pontos fora de `[0,1]` (R6).
3. **`dados.py`**: `preparar()` aplica as regras R1–R10 e monta `partidas`, `times`, ids, `meio` e
   `categoria_meio` (R3, R4), as colunas de agente e função de killer, vítima e planter, e o nick mais
   recente. Inclui também `para_json()` e `partida_bruta()`.
4. **`filtros.py`** e **`metricas.py`**, conforme a seção 3.2.
5. **`/api/filtros`**, o primeiro endpoint real, que prova o núcleo de ponta a ponta.

- **Pronto quando:**
  - `Σ kills válidos == Σ stats.kills`.
  - O ACS agregado de um jogador é igual a Σ score / Σ rounds calculado à mão.
  - O ranking de times (partidas ≥ 8) é igual ao da EDA (seção 10.6), que também usa somas.

  O ranking de **jogadores** da EDA não serve de referência: ele faz a média do ACS por partida (média de
  médias), e a spec define a soma antes da divisão.

### Fase 2: Domínios (≈ 4 h · 2–3 pessoas em paralelo, uma por router)

| Router | Endpoints (spec, seção 8) | Depende de |
|---|---|---|
| `jogadores.py` | ranking, distribuição, perfil, histórico | `agregar`, `ranking` |
| `partidas.py` | lista, scoreboard, rounds, abates, duelos | `agregar`, `abates.valido`, coordenadas |
| `times.py` | ranking, perfil (elenco, mapas, composições, confrontos, economia), partidas | `agregar`, `rounds` |
| `geral.py` | resumo, busca, heatmap | os três acima (o resumo reaproveita o ranking e a lista de partidas) |

Ordem sugerida dentro de cada router: **lista → detalhe → sub-recursos**. O frontend pode integrar cada
endpoint assim que ele estiver pronto.

### Fase 3: Análises (≈ 3 h · 1–2 pessoas, em paralelo à Fase 2)

1. `analises/__init__.py` (registro + autoimport) e `routers/analises.py`.
2. Portar as 9 análises da spec (seção 8.5), uma por arquivo. Cada uma reaproveita o código da seção 10 da
   EDA, já com `filtros.aplicar()` e devolvendo `n` (R8).
3. Os KPIs da Home (`/resumo`) chamam as funções de `pistol`, `first-kill`, `lado-por-mapa` e `meta-armas`,
   sem duplicar a lógica.

### Fase 4: Qualidade (≈ 1 h · 1 pessoa)

- `tests/test_smoke.py`: uma chamada por endpoint (status 200 e chaves principais) e um 404 por recurso.
- Conferência de números (spec, seção 9): ataque com 51,8%, pistol com 86,5% e `Σ kills` batendo.
- `tests/test_dados.py`: as checagens da validação de 21/10 viram asserts sobre `BASE`. Exemplos:
  `match_id` único, 5×5 por partida, placar = soma dos rounds, todos os UUIDs mapeados, coordenadas em
  `[0,1]`. Se alguém mexer no ETL, o teste acusa.
- Medir a latência dos endpoints mais pesados (perfil de jogador e de time, heatmap sem filtro). Meta: < 300 ms.

## 5. Divisão sugerida (4 pessoas)

| Pessoa | Fase 0–1 | Fase 2–3 | Fase 4 |
|---|---|---|---|
| A | esqueleto + `dados.py` | `partidas.py` | testes e números |
| B | `metricas.py` + `filtros.py` | `jogadores.py` + `geral.py` | — |
| C | ETL + `mapas.py` | `times.py` | — |
| D | (frontend: layout csstats com dados mockados da spec) | análises | integração no front |

Fluxo de git: branch curta por item (`feat/backend-<item>`) e PR pequeno para `main`. Como os routers já
estão registrados desde a Fase 0, os PRs não se tocam.

## 6. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Startup de ~5 s a cada `--reload` | Cache opcional: `dados.carregar()` salva e lê `outputs/cache/base.pkl` quando os mtimes de `data/` não mudaram |
| Frontend e backend divergirem no formato | A spec é o contrato: mudou o formato, atualiza a seção 8 da spec no mesmo PR |
| Diferenças de comportamento do pandas 3.0 (dtype `str`, copy-on-write) | Usar só `registros()` para serializar e evitar atribuição encadeada (`df[a][b] = …`) |
| Amostra pequena em alguns mapas, agentes e times | Toda resposta agregada devolve `n`; o ranking usa `min_rounds` |
| Escopo crescer durante o hackathon | Itens da spec (seção 10, Futuro) só entram depois da Fase 4 |

## 7. Decisões pendentes (do time)

| # | Decisão | Impacto se não decidir | Padrão adotado |
|---|---|---|---|
| D1 | Rating composto × ACS como métrica principal (spec, seção 10, item 1) | Nenhum: o padrão funciona | ACS |
| D2 | Quantas pessoas no backend e qual o prazo do hackathon | A divisão da seção 5 e as estimativas podem não caber | 4 pessoas, ~12 h somadas |
| D3 | Quem é a Pessoa A, B, C e D | Ninguém se apropria das fases | — |
| D4 | Corte mínimo de rounds do ranking de jogadores (`min_rounds`). Com 50, o 1º lugar tem só 3 partidas (TORONTO#lulu, ACS 345) e o top 10 tem mediana de 4,5 partidas | O ranking da Home e da página Ranking destaca amostras pequenas | 50 (spec, seção 8.2) |
| D5 | Corte mínimo de partidas dos times na Home (`top_times`) | Times com 1–2 partidas e 100% de vitórias no topo | 8 (o mesmo da EDA) |

Números para a discussão de D4 e D5 (todos os torneios, sem filtros):

| `min_rounds` | Jogadores no ranking | 1º lugar | Mediana de partidas no top 10 |
|---|---|---|---|
| 50 | 329 | TORONTO#lulu (3 partidas, ACS 345,4) | 4,5 |
| **100** | 222 | lule#dfnt (12 partidas, ACS 287,3) | 12 |
| 150 | 151 | lule#dfnt | 12,5 |
| 200 | 122 | lule#dfnt | 13 |

| `min_partidas` (times) | Times no ranking | 1º lugar |
|---|---|---|
| 0 | 68 | Ceub Octopus (9-0) |
| 5 | 47 | Ceub Octopus (9-0) |
| **8** | 34 | Ceub Octopus (9-0) |
| 10 | 29 | Macklogic Red (10-1) |

Sugestão para D4: 100 rounds. O topo estabiliza e ainda sobram mais da metade dos jogadores. D1 e D4
podem ser decididos juntos: um rating composto não resolve sozinho o problema de amostra.

Como mudar depois da decisão: D4 é a constante `MIN_ROUNDS_PADRAO` em `backend/app/routers/jogadores.py`;
D5 é `MIN_PARTIDAS_HOME` em `backend/app/routers/geral.py`. O front pode sobrescrever as duas pelos
parâmetros `min_rounds` e `min_partidas`.

## 8. Fora deste plano

- O rating composto (spec, seção 10, item 1) segue com ACS como métrica padrão. Pode virar uma análise
  depois sem mudar nenhum endpoint.
- O frontend no layout do csstats terá plano próprio (`docs/frontend/`) quando o backend chegar à Fase 2.
