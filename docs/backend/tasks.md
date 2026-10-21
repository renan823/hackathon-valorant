# Tasks — Backend do dashboard (VAVA Stats)

> Implementa o [plan.md](plan.md) a partir da [spec.md](spec.md). Marque `[x]` ao concluir e anote o
> responsável em **Dono**. As pessoas A–D seguem a divisão sugerida no plano (seção 5).

**Como ler cada tarefa:** *Arquivos* = o que a tarefa cria ou altera · *Depende* = o que precisa estar pronto
antes · *Aceite* = como provar que terminou. Estimativas em horas de uma pessoa.

## Visão geral

| Fase | Tarefas | Estimativa | Pode começar quando |
|---|---|---|---|
| 0. Esqueleto | T0.1–T0.4 | ~1 h | já |
| 1. Núcleo | T1.1–T1.9 | ~4 h | T0.2 |
| 2. Domínios | T2.1–T2.15 | ~5 h | T1.5–T1.8 (cada router lista as suas dependências) |
| 3. Análises | T3.1–T3.10 | ~3 h | T1.5, T1.7 e T3.1 |
| 4. Qualidade | T4.1–T4.4 | ~1,5 h | fim das fases 2 e 3 |

```
T0.1 → T0.2 ─┬─ T0.3, T0.4
             ├─ T1.1 → T1.2 → T1.3
             ├─ T1.4 ─┐
             ├─ T1.6  ├─ T1.5a/T1.5b ─┬─ T1.9 ─┬─ Fase 2 (routers em paralelo) ─┬─ T2.15 ─┐
             ├─ T1.7 ─┘               │        │                                │         ├─ Fase 4
             └─ T1.8 ─────────────────┘        └─ T3.1 → T3.2…T3.10 ────────────┘─────────┘
```

---

## Fase 0: Esqueleto (Pessoa A)

- [x] **T0.1 Dependências** · 10 min · Dono: Claude
  - *Arquivos:* `backend/requirements.txt` (`fastapi`, `uvicorn[standard]`, `pandas==3.0.6`, `numpy==2.5.4`,
    `pytest`, `httpx2`)
  - *Aceite:* `uv pip install --python .venv/bin/python -r backend/requirements.txt` funciona e
    `.venv/bin/python -c "import fastapi, uvicorn"` não dá erro.

- [x] **T0.2 Estrutura e stubs** · 30 min · Dono: Claude · *Depende:* T0.1
  - *Arquivos:* toda a árvore da spec (seção 4.1): `main.py`, `dados.py`, `filtros.py`, `metricas.py`,
    `mapas.py`, `routers/*.py`, `analises/__init__.py`, `tests/`.
  - Cada router já declara **todas** as rotas da spec (seção 8), com os parâmetros, e responde
    `HTTPException(501)`. O `main.py` tem `lifespan` chamando `dados.carregar()`, CORS para
    `localhost:5173` e `include_router(..., prefix="/api")` para os 5 routers.
  - `GET /api/saude` já funciona e devolve `{status, partidas, carregado_em}`.
  - *Aceite:* `.venv/bin/uvicorn app.main:app --app-dir backend` sobe; o `/docs` lista as 19 rotas da spec;
    `/api/saude` responde 200.

- [x] **T0.3 Proxy do Vite e README** · 10 min · Dono: Claude · ⚠️ proxy não testado: sem Node na máquina em que foi feito · *Depende:* T0.2
  - *Arquivos:* `vava/vite.config.js` (`server.proxy: {'/api': 'http://localhost:8000'}`), `README.md`
    (seção "Como executar" → backend).
  - *Aceite:* com backend e `npm run dev` rodando, `fetch('/api/saude')` no navegador devolve 200.

- [x] **T0.4 Base de testes** · 10 min · Dono: Claude · *Depende:* T0.2
  - *Arquivos:* `backend/tests/conftest.py` (fixture de sessão com `with TestClient(app) as c`),
    `backend/tests/test_smoke.py` com `test_saude`.
  - *Aceite:* `.venv/bin/pytest backend/tests` passa.

**✔ Checkpoint 0:** merge na `main`. A partir daqui cada pessoa trabalha em arquivos separados.

---

## Fase 1: Núcleo

### ETL e mapas (Pessoa C)

- [ ] **T1.1 Coordenadas e planter no ETL** · 30 min · Dono: ___ · *Depende:* T0.2
  - *Arquivos:* `src/valorant_data.py`
  - `abates`: novas colunas `vitima_x`, `vitima_y`, `killer_x`, `killer_y`, com coordenadas cruas do jogo e
    `None` quando o killer não está em `playerLocations`.
  - `rounds`: novas colunas `plant_x`, `plant_y` e `planter`, com `None` quando não houve plant.
  - *Aceite:* o número de linhas não muda (abates 46 753, rounds 6 618); `killer_x` nulo em 444 abates;
    `plant_x` preenchido em 4 653 rounds.

- [ ] **T1.2 Corrigir FK, FD e KAST (R10)** · 30 min · Dono: ___ · *Depende:* T1.1
  - *Arquivos:* `src/valorant_data.py` (`_processar_partida`)
  - First kill e first death passam a usar o primeiro abate **válido** do round; `com_kill` do KAST só conta
    killers de abates válidos. `first_kill_atacante` em `rounds` segue a mesma regra.
  - *Aceite:* `Σ first_kills == Σ first_deaths ==` nº de rounds com pelo menos 1 abate válido; antes e
    depois, no máximo 11 rounds mudam de first kill e no máximo 139 jogador × round perdem KAST.

- [ ] **T1.3 Reexecutar notebooks** · 20 min · Dono: ___ · *Depende:* T1.2
  - *Arquivos:* `notebooks/*.ipynb`, `outputs/processed/*.csv`
  - Rodar os dois notebooks com `nbconvert --execute --inplace`. Conferir e, se mudarem, atualizar nos
    textos da EDA: KAST r ≈ 0,59 (seção 10.7), FK 75% / 32% (seção 10.3) e a tabela "venceu × perdeu" (seção 10.1).
  - *Aceite:* os notebooks rodam sem erro e todo número citado nos textos confere com a saída.

- [ ] **T1.4 Normalização de coordenadas** · 30 min · Dono: ___ · *Depende:* T0.2
  - *Arquivos:* `reference/map_calibration.json` (cópia de `vava/assets/maps/calibration.json`),
    `backend/app/mapas.py`
  - `normalizar(mapa, x, y)` usa `x' = y·xMultiplier + xScalarToAdd`, `y' = x·yMultiplier + yScalarToAdd`, e
    devolve `None` para pontos fora de `[0,1]` (R6) ou entradas nulas. A chave do mapa é o nome em minúsculas.
  - *Aceite:* 100% dos 4 653 plants ficam em `[0,1]`; no máximo 47 pontos de abate são descartados.

### Dados (Pessoa A)

- [ ] **T1.5a `dados.py`: partidas, times e jogadores** · 1 h · Dono: ___ · *Depende:* T1.1, T1.4, T1.6
  - *Arquivos:* `backend/app/dados.py`
  - `carregar()` chama `carregar_tabelas()` e depois `preparar()` e preenche `BASE`.
  - `jogadores`: sem observadores, `nick` mais recente, `time_id`, `adversario_id`.
  - `partidas`: 1 linha por `match_id` com as colunas do plano (seção 3.1), incluindo `serie_id` (código sem a
    letra final), `time_a_id`, `time_b_id` e `vencedor_id`.
  - `times`: `time_id`, `nome` e lista de `torneios`.
  - *Aceite:* 336 partidas, 411 jogadores (`puuid`), 68 times; todas as tabelas têm `match_id`, `torneio`,
    `fase`, `data` e `mapa`.

- [ ] **T1.5b `dados.py`: rounds, abates e economia** · 1 h · Dono: ___ · *Depende:* T1.5a
  - `rounds`: colunas `*_id` dos times, `houve_plant`, `houve_defuse`, `agente_planter`, `funcao_planter` e
    `plant_x`/`plant_y` normalizados.
  - `abates`: `killer_time_id`, `vitima_time_id`, `lado_vitima`, `agente_killer`/`funcao_killer`,
    `agente_vitima`/`funcao_vitima`, `meio` e `categoria_meio` (R3, R4) e coordenadas normalizadas.
  - `economia`: `arma` e `armadura` traduzidas.
  - *Aceite:* `Σ abates.valido == Σ jogadores.kills` (3 360 de 3 360 jogador × partida); `meio` nunca nulo;
    as colunas do contrato (plano, seção 3.1) existem.

- [ ] **T1.6 `para_json` e `partida_bruta`** · 20 min · Dono: ___ · *Depende:* T0.2
  - *Arquivos:* `backend/app/dados.py`
  - *Aceite:* teste unitário em que `para_json` converte DataFrame, Series, dict aninhado, `np.int64`,
    `np.bool`, `NaN`, `pd.Timestamp` e float (arredondado para 2 casas) em tipos JSON. `partida_bruta(id)`
    devolve o JSON do arquivo, com `lru_cache`, e levanta `KeyError` para id inexistente.

### Filtros e métricas (Pessoa B)

- [ ] **T1.7 `Filtros`** · 30 min · Dono: ___ · *Depende:* T0.2
  - *Arquivos:* `backend/app/filtros.py`
  - *Aceite:* testes unitários com um DataFrame pequeno:
    - aceita múltiplos valores;
    - ignora colunas que o `df` não tem;
    - `col_time` em tupla aplica OU;
    - sem filtros, devolve o `df` inteiro.

- [ ] **T1.8 `agregar` e `ranking`** · 45 min · Dono: ___ · *Depende:* T0.2
  - *Arquivos:* `backend/app/metricas.py`
  - Métricas da spec (seção 6) somando antes de dividir. Divisão por zero (ex.: `deaths = 0`) → `None`.
  - `ranking()` aplica `min_rounds`, ordena e adiciona `posicao`.
  - *Aceite:* para 1 jogador escolhido, `acs`, `adr`, `kd` e `kast_pct` iguais à conta feita à mão sobre as
    linhas dele; `agregar(df, ["match_id", "puuid"])` reproduz o ACS de `outputs/processed/jogadores.csv`;
    329 jogadores com `min_rounds=50`.

- [ ] **T1.9 `GET /api/filtros`** · 20 min · Dono: ___ · *Depende:* T1.5b, T1.6
  - *Aceite:* 4 torneios (a Univavá com 5 fases); 10 mapas (sem Bind e Icebox, R8); 68 times; 28 agentes
    com função; 4 funções.

**✔ Checkpoint 1:** `BASE`, `Filtros`, `agregar` e `/filtros` na `main`. Os routers da Fase 2 podem ser plugados.

---

## Fase 2: Domínios

Em todo endpoint: aplicar `Filtros`, passar a resposta por `para_json` e devolver 404 para id inexistente.
Formatos conforme a spec (seção 8).

### `routers/jogadores.py` (Pessoa B) · *Depende:* T1.5b, T1.7, T1.8

- [ ] **T2.1 `GET /api/jogadores`** · 45 min · Dono: ___
  - `time`, `agente_principal` e `funcao_principal` = o mais frequente nas partidas filtradas.
  - *Aceite:* sem parâmetros devolve 100 linhas, todas com `rounds ≥ 50`, ordenadas por `acs`;
    `ordenar=kd` reordena; `ordenar=xyz` → 422; `mapa=Ascent` muda os números.

- [ ] **T2.2 `GET /api/jogadores/distribuicao`** · 20 min · Dono: ___ · *Depende:* T2.1
  - *Aceite:* `Σ jogadores` = nº de elegíveis; `pct_acumulado` termina em 100; `bins` respeitado.

- [ ] **T2.3 `GET /api/jogadores/{puuid}`** · 45 min · Dono: ___ · *Depende:* T2.1
  - *Aceite:* para um jogador com 2 nicks, `nicks_anteriores` tem 1 item; jogador em 2 times (R9) lista os
    dois; `Σ armas.kills` = kills válidos dele; `posicao_ranking` é `null` se ele tiver menos de 50 rounds.

- [ ] **T2.4 `GET /api/jogadores/{puuid}/partidas`** · 20 min · Dono: ___
  - *Aceite:* nº de linhas = partidas do jogador; ordem por data decrescente; `kills` = `stats.kills`.

### `routers/partidas.py` (Pessoa A) · *Depende:* T1.5b, T1.7, T1.8

- [ ] **T2.5 `GET /api/partidas`** · 30 min · Dono: ___
  - *Aceite:* 336 sem filtros; data decrescente; `time=ufmt_turuna` devolve 36 partidas; `mvp` = maior ACS.

- [ ] **T2.6 `GET /api/partidas/{id}`** · 45 min · Dono: ___
  - *Aceite:* 2 times × 5 jogadores; placar igual ao nome do arquivo; `atk_rounds + def_rounds = placar`.

- [ ] **T2.7 `GET /api/partidas/{id}/rounds`** · 30 min · Dono: ___
  - *Aceite:* nº de itens = `n_rounds`; o `first_kill` de cada round é o primeiro abate válido.

- [ ] **T2.8 `GET /api/partidas/{id}/abates`** · 30 min · Dono: ___
  - *Aceite:* inclui os registros não válidos com `valido: false`, para o kill feed mostrar mortes por spike
    e queda; `killer_pos` é `null` quando ausente; coordenadas em `[0,1]`.

- [ ] **T2.9 `GET /api/partidas/{id}/duelos`** · 30 min · Dono: ___
  - *Aceite:* `Σ arestas.total` = abates válidos da partida; `Σ nos.kills` = `Σ stats.kills`.

### `routers/times.py` (Pessoa C) · *Depende:* T1.5b, T1.7, T1.8

- [ ] **T2.10 `GET /api/times`** · 45 min · Dono: ___
  - *Aceite:* com partidas ≥ 8 (filtro feito no teste), a ordem bate com a EDA (seção 10.6): Ceub Octopus
    (9-0, +76), Macklogic Red (10-1, +52), Ufu Saints (14-4, +66), Axis Anteaters, Azure Bears Golden (24-8, +174)…
    `atk_win_pct` e `def_win_pct` vêm de `rounds`.

- [ ] **T2.11 `GET /api/times/{id}`** · 1 h · Dono: ___ · *Depende:* T2.10
  - *Aceite:* `elenco` só com as partidas pelo time; `Σ por_mapa.partidas = resumo.partidas`; cada
    composição tem 5 agentes; `Σ confrontos.partidas = resumo.partidas`; `economia` usa `compra_atk` ou
    `compra_def` conforme o lado do time.

- [ ] **T2.12 `GET /api/times/{id}/partidas`** · 10 min · Dono: ___ · *Depende:* T2.5
  - Reaproveitar a função de T2.5 com `time` fixado.

### `routers/geral.py` (Pessoa B, ou D se estiver livre)

- [ ] **T2.13 `GET /api/busca`** · 20 min · Dono: ___ · *Depende:* T1.5a
  - *Aceite:* `q=unicamp` devolve os times Unicamp; a busca ignora acento e caixa; no máximo 10 resultados;
    `q` com menos de 2 caracteres → 422.

- [ ] **T2.14 `GET /api/heatmap`** · 45 min · Dono: ___ · *Depende:* T1.5b, T1.7
  - Monta a visão por `tipo` (plano, seção 2) e depois aplica `Filtros`.
  - *Aceite:* `mapa=Ascent&tipo=plants` → `total = 1049`; `tipo=mortes&agente=Jett` só traz mortes de Jetts;
    `tipo=kills` ignora abates não válidos e sem posição; sem `mapa` → 422.

- [ ] **T2.15 `GET /api/resumo`** · 30 min · Dono: ___ · *Depende:* T2.1, T2.5, T2.10, T3.2–T3.4, T3.7
  - *Aceite:* contadores 336 partidas / 411 jogadores / 68 times / 6 618 rounds / 46 371 abates válidos;
    8 últimas partidas; top 5 jogadores e top 5 times; `kpis` vindos das análises, sem recalcular.

**✔ Checkpoint 2:** as 19 rotas respondem 200 com dados reais.

---

## Fase 3: Análises (Pessoa D)

- [ ] **T3.1 Registro e router** · 45 min · Dono: ___ · *Depende:* T1.5a, T1.6, T1.7
  - *Arquivos:* `backend/app/analises/__init__.py`, `backend/app/routers/analises.py`
  - Decorator `@analise`, `REGISTRO` e autoimport com `pkgutil.iter_modules`.
  - *Aceite:* criar um arquivo de teste com `@analise` faz a análise aparecer em `/api/analises` sem tocar
    em outro arquivo; id desconhecido → 404; os filtros chegam até a função.

Uma análise por arquivo em `backend/app/analises/`. Cada uma devolve `n` (R8), e o valor de referência
abaixo é o *Aceite* sem filtros.

- [ ] **T3.2 `lado_por_mapa.py`** · 20 min · Dono: ___ · ataque vence 51,8% no geral; Ascent pende para a defesa.
- [ ] **T3.3 `first_kill.py`** · 20 min · Dono: ___ · o ataque vence 75,4% com first kill e 32,3% sem (só rounds com abate; a EDA dá 32,1% porque inclui rounds sem abate). Pode variar um pouco após T1.2.
- [ ] **T3.4 `pistol.py`** · 20 min · Dono: ___ · o vencedor do pistol vence o round seguinte em 86,5%.
- [ ] **T3.5 `vantagem_economica.py`** · 30 min · Dono: ___ · curva em S, sem pistols: ~49% em ±2 mil; satura em 16–19% e 81–86%.
- [ ] **T3.6 `compras.py`** · 30 min · Dono: ___ · matriz ataque × defesa com n ≥ 30; full × full ≈ 50%.
- [ ] **T3.7 `meta_armas.py`** · 20 min · Dono: ___ · abates válidos: Vandal 37,6%, Phantom 24,3%.
- [ ] **T3.8 `meta_agentes.py`** · 30 min · Dono: ___ · pick rate e win rate por agente × mapa; Omen é o mais escolhido (588).
- [ ] **T3.9 `metricas_vitoria.py`** · 30 min · Dono: ___ · correlação ponto-bisserial com `venceu`; KAST é a maior (r ≈ 0,59).
- [ ] **T3.10 `plant_sites.py`** · 20 min · Dono: ___ · Haven: C 464 / A 404 / B 148; Lotus: C 546 / A 482 / B 226.

**✔ Checkpoint 3:** `/api/analises` lista 9 análises e todas respondem com os valores de referência.

---

## Fase 4: Qualidade (Pessoa A)

- [ ] **T4.1 Smoke test completo** · 30 min · Dono: ___ · *Depende:* Checkpoints 2 e 3
  - *Arquivos:* `backend/tests/test_smoke.py`
  - Uma chamada por rota (status 200 e chaves principais), um 404 por recurso e os números da spec
    (seção 9): 51,8%, 86,5% e `Σ kills`.
  - *Aceite:* `pytest` passa em menos de 30 s.

- [ ] **T4.2 Testes de consistência dos dados** · 30 min · Dono: ___ · *Depende:* T1.5b
  - *Arquivos:* `backend/tests/test_dados.py`
  - As checagens da validação viram asserts sobre `BASE`: `match_id` único, 5×5 por partida, placar = soma
    dos rounds, lados trocam no round 13, todos os UUIDs mapeados, coordenadas em `[0,1]`, `Σ kills` batendo.
  - *Aceite:* passa; quebrar o ETL de propósito (ex.: remover o filtro `valido`) faz o teste falhar.

- [ ] **T4.3 Desempenho** · 20 min · Dono: ___ · *Depende:* T4.1
  - Medir `/jogadores/{puuid}`, `/times/{id}`, `/heatmap?mapa=Ascent&tipo=mortes` e `/resumo`.
  - *Aceite:* todos abaixo de 300 ms. Se o startup passar de 10 s, implementar o cache em pickle (plano, seção 6).

- [ ] **T4.4 Fechamento da documentação** · 10 min · Dono: ___
  - Status da spec → "implementada"; registrar na spec qualquer mudança de formato feita durante a
    implementação ; README com o comando de execução e o link para `/docs`.

**✔ Checkpoint 4:** backend pronto para o frontend consumir.
