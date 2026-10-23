# Hackathon Valorant — Documentação dos Dados

Este repositório contém dados de partidas do torneio universitário de Valorant disponibilizados para o hackathon. Os dados estão no formato JSON, com **336 arquivos** distribuídos em 4 torneios.

---

## Organização do repositório

```
hackathon-valorant/
├── apps/
│   ├── api/                # API FastAPI do dashboard (dados em memória) — ver docs/backend/
│   └── web/                # dashboard VAVA Stats (React/Vite), consome a API; scripts/baixar_icones.py gera os ícones
├── packages/
│   └── valorant-data/      # valorant_data.py: lê os JSONs e gera as tabelas jogadores, rounds, economia e abates
├── analysis/
│   ├── notebooks/          # preparação (gera outputs/processed/), EDA e aula/ (notebooks de aula originais)
│   ├── scripts/            # visualizações sobre o mapa (teste_mapa*.py)
│   ├── brainstorming/      # ETL para SQLite + notebook marimo (projeto uv próprio)
│   └── requirements.txt    # dependências de notebooks/ e scripts/
├── data/                   # JSONs brutos das partidas (não editar) — ver "Estrutura de data/"
├── reference/              # tabelas de referência (UUID -> nome de agentes, armas, armaduras e mapas) e calibração dos mapas
├── outputs/
│   ├── figures/            # figuras geradas pelos scripts
│   └── processed/          # bases tratadas em CSV (geradas, não versionadas)
└── docs/                   # spec, plano e tarefas do backend (docs/backend/) e do front (docs/frontend/)
```

`apps/` são as aplicações que rodam (API e front), `packages/` o código compartilhado entre elas e a análise,
`analysis/` o trabalho exploratório. `data/`, `reference/` e `outputs/` ficam na raiz porque todos usam.

## Subir o dashboard (VAVA Stats)

Precisa de Python 3.12 e Node 22.12 ou mais (ou 20.19+), que o Vite 8 exige. Dois terminais, ambos a partir da
**raiz do repositório**:

```sh
# terminal 1: backend (API em http://localhost:8000/api; lê data/ ao subir)
python3 -m venv .venv && .venv/bin/pip install -r apps/api/requirements.txt   # só na primeira vez
.venv/bin/uvicorn app.main:app --reload --app-dir apps/api --port 8000

# terminal 2: front (abre em http://localhost:5173)
cd apps/web && npm install && npm run dev
```

O Vite repassa `/api` para a porta 8000. Com o backend desligado, o app mostra um aviso com o comando acima e
volta sozinho quando ele sobe. Detalhes do front em [`apps/web/README.md`](apps/web/README.md); spec, plano e tarefas
em [`docs/frontend/`](docs/frontend/) e [`docs/backend/`](docs/backend/).

### Executar com Docker

Com Docker Engine e o plugin Docker Compose instalados, rode na raiz do repositório:

```sh
docker compose up --build
```

O dashboard ficará disponível em <http://localhost:8080>; a API é acessada pelo proxy do frontend e também
pode ser conferida em <http://localhost:8080/api/saude>. A primeira compilação inclui os JSONs de `data/`
na imagem da API (cerca de 194 MB no conjunto atual) e pode demorar mais; os dados são carregados em memória
quando a API inicia. Para parar os containers, use `Ctrl+C` e `docker compose down`. A porta do frontend pode
ser alterada, por exemplo, com `WEB_PORT=8081 docker compose up --build`.

## Como executar

Todos os comandos abaixo partem da **raiz do repositório**.

**Notebooks e scripts (pandas)**

```sh
uv venv .venv && uv pip install --python .venv/bin/python -r analysis/requirements.txt
# ou: python3 -m venv .venv && .venv/bin/pip install -r analysis/requirements.txt

# a preparação roda primeiro: grava outputs/processed/, lido pela análise exploratória
.venv/bin/jupyter nbconvert --to notebook --execute --inplace analysis/notebooks/valorant-data-preparation.ipynb
.venv/bin/jupyter nbconvert --to notebook --execute --inplace analysis/notebooks/valorant-exploratory-data-analysis.ipynb

.venv/bin/python analysis/scripts/teste_mapa_calor.py
```

**ETL em SQLite + marimo (`analysis/brainstorming/`)** — o loader lê `./data` e grava `./valorant.db` na pasta atual, por isso deve ser executado da raiz:

```sh
uv sync --project analysis/brainstorming
uv run --project analysis/brainstorming analysis/brainstorming/loader.py
uv run --project analysis/brainstorming marimo edit analysis/brainstorming/notebook.py
```

**Backend (`apps/api/`)**: API do dashboard. Lê `data/` na inicialização e serve tudo em `/api`.

```sh
uv pip install --python .venv/bin/python -r apps/api/requirements.txt
.venv/bin/uvicorn app.main:app --reload --app-dir apps/api --port 8000
# documentação interativa: http://localhost:8000/docs
.venv/bin/pytest apps/api/tests
```

São 19 rotas (jogadores, times, partidas, heatmap, busca, resumo da Home e análises plugáveis), documentadas
na spec. Para criar uma análise nova basta um arquivo em `apps/api/app/analises/` (passo a passo na spec, §8.5).
Spec, plano e tarefas em [`docs/backend/`](docs/backend/).

**Dashboard (`apps/web/`)**: React + Vite, consome só a API. Ver "Subir o dashboard" acima e
[`apps/web/README.md`](apps/web/README.md).

```sh
cd apps/web && npm install && npm run dev      # http://localhost:5173
npm run lint && npm run build              # antes de enviar
```

## Estrutura de `data/`

```
data/
├── Rush Series Esquenta/          # Torneio 1
├── Rush Series Esquenta 2/        # Torneio 2
├── Rush Series Inclusivo/         # Torneio 3
├── Classificatória 1/
├── Classificatória 2/
├── Classificatória 3/
├── Classificatória 4/
└── Fase de Grupos/
```

## Nomenclatura dos Arquivos

```
<TORNEIO>_<ID>_<DATA>_<time1>_<score1>_x_<score2>_<time2>_<mapa>.json
```

Exemplo:
```
UNIVAVA_C1_002_27-06-26_poli_plague_10_x_13_unicamp_tritons_red_haven.json
```

| Parte | Valor | Significado |
|-------|-------|-------------|
| `UNIVAVA_C1` | prefixo | Identificador do torneio/fase |
| `002` | número | Número sequencial da partida |
| `27-06-26` | data | Data da partida (DD-MM-AA) |
| `poli_plague` | time | Nome do time da esquerda |
| `10` | placar | Rounds vencidos pelo time da esquerda |
| `x` | separador | — |
| `13` | placar | Rounds vencidos pelo time da direita |
| `unicamp_tritons_red` | time | Nome do time da direita |
| `haven` | mapa | Mapa jogado |

> **Atenção:** a posição no nome do arquivo **não** indica o lado `Red`/`Blue` do JSON: o time da esquerda é o `Red` em apenas 160 das 336 partidas. Como o JSON não traz o nome dos times, associe cada `teamId` ao nome pelo placar (`teams[].roundsWon` = placar no nome do arquivo), como faz `packages/valorant-data/valorant_data.py`. O placar nunca empata, então a associação é sempre única.

---

## Estrutura do JSON

Cada arquivo representa uma partida completa e possui **5 chaves de topo**, presentes em todos os 336 arquivos.

```json
{
  "matchInfo":    { ... },
  "players":      [ ... ],
  "coaches":      [ ... ],
  "teams":        [ ... ],
  "roundResults": [ ... ]
}
```

---

### `matchInfo` — Metadados da Partida

Objeto único com informações gerais sobre a partida.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `matchId` | `string` | UUID único da partida |
| `mapId` | `string` | Caminho interno do mapa (ver tabela de mapas) |
| `gameVersion` | `string` | Versão do cliente do jogo (ex: `release-13.00-...`) |
| `gameLengthMillis` | `int` | Duração total da partida em milissegundos |
| `gameStartMillis` | `int` | Timestamp Unix de início da partida (ms) |
| `region` | `string` | Região do servidor — sempre `"br"` neste dataset |
| `isCompleted` | `bool` | Indica se a partida foi concluída — sempre `true` neste dataset |
| `isRanked` | `bool` | Indica se é ranqueada — sempre `false` (partidas customizadas) |
| `gameMode` | `string` | Modo de jogo — sempre `"/Game/GameModes/Bomb/BombGameMode.BombGameMode_C"` (modo Spike) |
| `provisioningFlowId` | `string` | Tipo de criação da partida — sempre `"CustomGame"` |
| `queueId` | `string` | ID da fila — sempre vazio `""` (jogo customizado) |
| `customGameName` | `string` | Nome customizado da sala — geralmente vazio |
| `seasonId` | `string` | UUID do episódio/ato do jogo |
| `premierMatchInfo` | `object` | Informações de partidas Premier — sempre vazio `{}` neste dataset |

#### Tabela de Mapas (`mapId`)

| `mapId` | Nome do Mapa |
|---------|--------------|
| `/Game/Maps/Ascent/Ascent` | Ascent |
| `/Game/Maps/Triad/Triad` | Haven |
| `/Game/Maps/Bonsai/Bonsai` | Split |
| `/Game/Maps/Jam/Jam` | Lotus |
| `/Game/Maps/Pitt/Pitt` | Pearl |
| `/Game/Maps/Foxtrot/Foxtrot` | Breeze |
| `/Game/Maps/Canyon/Canyon` | Fracture |
| `/Game/Maps/Duality/Duality` | Bind |
| `/Game/Maps/Port/Port` | Icebox |
| `/Game/Maps/Juliett/Juliett` | Sunset |
| `/Game/Maps/Infinity/Infinity` | Abyss |
| `/Game/Maps/Plummet/Plummet` | Summit |

---

### `players` — Lista de Jogadores

Array com um objeto por jogador. Partidas normais têm 10 jogadores (5 por time). Pode conter observadores adicionais.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `puuid` | `string` | ID único do jogador (Player UUID) — chave de ligação entre todas as seções |
| `gameName` | `string` | Nome de exibição do jogador (nick) |
| `tagLine` | `string` | Tag do jogador (ex: `#BR1`) |
| `teamId` | `string` | Time do jogador: `"Red"`, `"Blue"` ou `"Neutral"` (observador) |
| `partyId` | `string` | UUID do grupo/party — jogadores no mesmo party compartilham este valor |
| `characterId` | `string \| null` | UUID do agente selecionado (ver tabela de agentes). `null` se observador |
| `competitiveTier` | `int` | Rank competitivo do jogador (0 = não ranqueado/oculto neste dataset) |
| `isObserver` | `bool` | `true` se o jogador está apenas observando (sem participar ativamente) |
| `playerCard` | `string` | UUID do card de jogador equipado (cosmético) |
| `playerTitle` | `string` | UUID do título de jogador equipado (cosmético) |
| `accountLevel` | `int` | Nível da conta do jogador |
| `stats` | `object \| null` | Estatísticas agregadas da partida. `null` quando `isObserver = true` |

#### `players[].stats` — Estatísticas Agregadas

> Soma de todos os rounds jogados pelo jogador nesta partida.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `score` | `int` | Pontuação total acumulada (base do ACS — Average Combat Score) |
| `roundsPlayed` | `int` | Número de rounds em que o jogador participou |
| `kills` | `int` | Total de eliminações |
| `deaths` | `int` | Total de mortes |
| `assists` | `int` | Total de assistências |
| `playtimeMillis` | `int` | Tempo total de jogo em milissegundos |
| `abilityCasts` | `object` | Contagem de uso de habilidades (ver abaixo) |

#### `players[].stats.abilityCasts` — Uso de Habilidades

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `grenadeCasts` | `int` | Usos da habilidade de granada/C (Signature Ability em alguns agentes) |
| `ability1Casts` | `int` | Usos da habilidade Q |
| `ability2Casts` | `int` | Usos da habilidade E |
| `ultimateCasts` | `int` | Usos da ultimate X |

#### Tabela de Agentes (`characterId`)

Agentes que aparecem no dataset, com o número de escolhas (jogador × partida). A fonte é `reference/valorant_reference.json` (valorant-api.com), que também traz a função de cada agente. Cada agente tem um único UUID e todos os `characterId` do dataset estão mapeados.

| `characterId` | Agente | Função | Escolhas |
|---|---|---|---|
| `41fb69c1-4189-7b37-f117-bcaf1e96f1bf` | Astra | Controlador | 55 |
| `9f0d8ba9-4140-b941-57d3-a7ad57c6b417` | Brimstone | Controlador | 10 |
| `1dbf2edd-4729-0984-3115-daa5eed44993` | Clove | Controlador | 13 |
| `95b78ed7-4637-86d9-7e41-71ba8c293152` | Harbor | Controlador | 19 |
| `8e253930-4c05-31dd-1b6c-968525494517` | Omen | Controlador | 588 |
| `707eab51-4836-f488-046a-cda6bf494859` | Viper | Controlador | 111 |
| `0e38b510-41a8-5780-5e8f-568b2a4f2d6c` | Iso | Duelista | 4 |
| `add6443a-41bd-e414-f6ad-e58d267f4e95` | Jett | Duelista | 329 |
| `bb2a4828-46eb-8cd1-e765-15848195d751` | Neon | Duelista | 211 |
| `eb93336a-449b-9c1b-0a54-a891f7921d69` | Phoenix | Duelista | 389 |
| `f94c3b30-42be-e959-889c-5aa313dba261` | Raze | Duelista | 173 |
| `a3bfb853-43b2-7238-a4f1-ad90e9e46bcc` | Reyna | Duelista | 10 |
| `df1cb487-4902-002e-5c17-d28e83e78588` | Waylay | Duelista | 51 |
| `7f94d92c-4234-0a36-9646-3a87eb8b5c89` | Yoru | Duelista | 47 |
| `5f8d3a7f-467b-97f3-062c-13acf203c006` | Breach | Iniciador | 31 |
| `dade69b4-4f5a-8528-247b-219e5a1facd6` | Fade | Iniciador | 202 |
| `e370fa57-4757-3604-3648-499e1f642d3f` | Gekko | Iniciador | 2 |
| `601dbbe7-43ce-be57-2a40-4abd24953621` | KAY/O | Iniciador | 21 |
| `6f2a04ca-43e0-be17-7f36-b3908627744d` | Skye | Iniciador | 67 |
| `320b2a48-4d9b-a075-30f1-1f93a9b638fa` | Sova | Iniciador | 391 |
| `b444168c-4e35-8076-db47-ef9bf368f384` | Tejo | Iniciador | 6 |
| `22697a3d-45bf-8dd7-4fec-84a9e28c69d7` | Chamber | Sentinela | 154 |
| `117ed9e3-49f3-6512-3ccf-0cada7e3823b` | Cypher | Sentinela | 188 |
| `cc8b64c8-4b25-4ff9-6e7f-37b4da43d235` | Deadlock | Sentinela | 2 |
| `1e58de9c-4950-5125-93e9-a0aee9f98746` | Killjoy | Sentinela | 117 |
| `569fdd95-4d10-43ab-ca70-79becc718b46` | Sage | Sentinela | 28 |
| `92eeef5d-43b5-1d4a-8d03-b3927a09034b` | Veto | Sentinela | 1 |
| `efba5359-4016-a1e5-7626-b1ae76895940` | Vyse | Sentinela | 140 |

---

### `coaches` — Lista de Técnicos

Array com os técnicos (coaches) registrados na partida. Presente em **180 de 336 arquivos** (ausente em alguns torneios).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `puuid` | `string` | UUID do técnico |
| `teamId` | `string` | Time associado: `"Red"` ou `"Blue"` |

> Técnicos **não** aparecem em `players` e **não** possuem estatísticas de partida.

---

### `teams` — Resultado por Time

Array com exatamente **2 objetos**, um para cada time (`"Red"` e `"Blue"`).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `teamId` | `string` | Identificador do time: `"Red"` ou `"Blue"` |
| `won` | `bool` | `true` se o time venceu a partida |
| `roundsPlayed` | `int` | Total de rounds jogados (igual para ambos os times) |
| `roundsWon` | `int` | Rounds vencidos pelo time |
| `numPoints` | `int` | Mesmo valor que `roundsWon` neste dataset |
| `rank` | `int` | Posição final: `1` (vencedor) ou `2` (perdedor) |

---

### `roundResults` — Resultados por Round

Array com um objeto por round jogado. Uma partida padrão tem entre 13 e 25 rounds (overtime incluído).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `roundNum` | `int` | Número do round (começa em `0`) |
| `roundResult` | `string` | Resultado descritivo do round (ver valores possíveis) |
| `roundResultCode` | `string` | Código resumido do resultado (ver valores possíveis) |
| `roundCeremony` | `string` | Cerimônia/destaque ao fim do round (ver valores possíveis) |
| `winningTeam` | `string` | Time vencedor do round: `"Red"` ou `"Blue"` |
| `winningTeamRole` | `string` | Papel do time vencedor: `"Attacker"` (atacante) ou `"Defender"` (defensor) |
| `bombPlanter` | `string \| null` | `puuid` do jogador que plantou a spike. `null` se não houve planta |
| `bombDefuser` | `string \| null` | `puuid` do jogador que desarmou a spike. `null` se não houve desarmamento |
| `plantRoundTime` | `int` | Tempo (ms desde o início do round) em que a spike foi plantada. `0` se não houve planta |
| `plantSite` | `string` | Site onde a spike foi plantada: `"A"`, `"B"`, `"C"` ou `""` (sem planta) |
| `plantLocation` | `object` | Coordenadas `{x, y}` da planta no mapa. `{0,0}` se não houve planta |
| `plantPlayerLocations` | `array \| null` | Posições de todos os jogadores no momento da planta (ver estrutura abaixo). `null` se não houve planta |
| `defuseRoundTime` | `int` | Tempo (ms desde o início do round) do desarmamento. `0` se não houve |
| `defuseLocation` | `object` | Coordenadas `{x, y}` do desarmamento. `{0,0}` se não houve |
| `defusePlayerLocations` | `array \| null` | Posições de todos os jogadores no momento do desarmamento. `null` se não houve |
| `playerStats` | `array` | Estatísticas individuais de cada jogador neste round (ver seção abaixo) |

#### Valores de `roundResult`

| Valor | Significado |
|-------|-------------|
| `"Eliminated"` | Todos os jogadores do time perdedor foram eliminados |
| `"Bomb defused"` | A spike foi desarmada pelos defensores |
| `"Bomb detonated"` | A spike explodiu (atacantes venceram após a planta) |
| `"Round timer expired"` | O tempo do round esgotou sem planta (defensores vencem) |

#### Valores de `roundResultCode`

| Valor | Significado |
|-------|-------------|
| `"Elimination"` | Vitória por eliminação |
| `"Defuse"` | Vitória por desarmamento |
| `"Detonate"` | Vitória por detonação |
| `""` | Sem código (timer expirado) |

#### Valores de `roundCeremony`

| Valor | Significado |
|-------|-------------|
| `"CeremonyDefault"` | Round normal, sem destaque especial |
| `"CeremonyAce"` | Ace individual — um jogador eliminou os 5 adversários |
| `"CeremonyTeamAce"` | Team Ace — cada jogador do time fez pelo menos 1 kill |
| `"CeremonyClutch"` | Clutch — 1 jogador venceu contra múltiplos adversários |
| `"CeremonyCloser"` | Round decisivo (13º round de um time) |
| `"CeremonyFlawless"` | Flawless — time venceu sem nenhum membro morrer |
| `"CeremonyThrifty"` | Thrifty — time com equipamento inferior venceu o round |

---

### `roundResults[].plantPlayerLocations` / `defusePlayerLocations`

Array de snapshots de posição de cada jogador no momento da planta ou desarmamento.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `puuid` | `string` | Identificador do jogador |
| `viewRadians` | `float` | Direção para onde o jogador está olhando (em radianos, 0–2π) |
| `location.x` | `int` | Coordenada X no mapa |
| `location.y` | `int` | Coordenada Y no mapa |

> As coordenadas `{x, y}` usam o sistema de coordenadas interno do Valorant. O eixo Y é **invertido** em relação ao padrão matemático (valores mais negativos = mais ao norte no mapa).

---

### `roundResults[].playerStats` — Estatísticas por Jogador por Round

Array com um objeto por jogador (10 por round). Contém kills, dano, economia e uso de habilidades **naquele round específico**.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `puuid` | `string` | Identificador do jogador |
| `score` | `int` | Pontuação do jogador neste round (contribui para o ACS) |
| `kills` | `array` | Lista de kills realizadas neste round (ver estrutura abaixo) |
| `damage` | `array` | Lista de registros de dano causado neste round (ver estrutura abaixo) |
| `economy` | `object` | Estado econômico do jogador no início do round (ver abaixo) |
| `ability` | `object` | Efeitos de habilidades neste round (ver abaixo) |

---

### `roundResults[].playerStats[].kills` — Detalhes de Cada Kill

Array de kills realizadas por este jogador neste round.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `timeSinceGameStartMillis` | `int` | Tempo desde o início da partida (ms) |
| `timeSinceRoundStartMillis` | `int` | Tempo desde o início do round (ms) |
| `killer` | `string` | `puuid` de quem realizou a kill |
| `victim` | `string` | `puuid` de quem foi eliminado |
| `victimLocation` | `object` | Coordenadas `{x, y}` da vítima no momento da morte |
| `assistants` | `array` | Lista de `puuid`s de jogadores que deram assistência |
| `playerLocations` | `array` | Snapshot de posições de todos os jogadores no momento da kill (mesma estrutura de `plantPlayerLocations`) |
| `finishingDamage` | `object` | Informações sobre o golpe final (ver abaixo) |

#### `finishingDamage` — Golpe Final

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `damageType` | `string` | Tipo do dano: `"Weapon"`, `"Ability"`, `"Melee"`, `"Bomb"`, `"Crush"`, `"Fall"` |
| `damageItem` | `string` | UUID da arma ou nome da habilidade usada (ver tabelas abaixo) |
| `isSecondaryFireMode` | `bool` | `true` se foi com o modo de disparo alternativo (ex: zoom do Marshal) |

#### Valores de `damageType`

| Valor | Significado | Kills |
|-------|-------------|-------|
| `"Weapon"` | Arma de fogo (pistola, rifle etc.). Ver a nota sobre habilidades abaixo | 45121 |
| `"Ability"` | Habilidade de agente | 1238 |
| `"Melee"` | Faca (corpo a corpo); `damageItem` = `2F59173C-4BED-B6C3-2191-DEA9B58BE9C7` | 15 |
| `"Bomb"` | Explosão da spike | 327 |
| `"Fall"` | Dano de queda | 48 |
| `"Crush"` | Esmagamento | 4 |

> **Nem todo item de `kills` é um abate.** A lista inclui 373 registros com `killer = victim` (spike 327, queda 40, habilidade 5, esmagamento 1) e 9 teamkills. Esses registros **não** entram em `stats.kills`: removendo-os, a soma das kills dos rounds bate com `stats.kills` para todos os jogadores. Para métricas, armas e duelos, use só os abates com `killer != victim` e times diferentes.

#### `damageItem` — Identificadores de Armas e Habilidades

Quando `damageType = "Weapon"` (ou `"Melee"`), o valor é um UUID de arma. Tabela gerada a partir de `reference/valorant_reference.json` com os itens presentes no dataset (abates = `finishingDamage`; rounds = `economy.weapon`):

| UUID | Item | Categoria | Abates | Rounds equipada |
|------|------|-----------|--------|-----------------|
| `410B2E0B-4CEB-1321-1727-20858F7F3477` | Bandit | Sidearm | 949 | 1678 |
| `29A0CFAB-485B-F5D5-779A-B59F85E204A8` | Classic | Sidearm | 1632 | 5743 |
| `44D4E95C-4157-0037-81B2-17841BF2E8E3` | Frenzy | Sidearm | 56 | 121 |
| `1BAA85B4-4C70-1284-64BB-6481DFC3BB4E` | Ghost | Sidearm | 2554 | 3268 |
| `E336C6B8-418D-9340-D77F-7A9E4CFE0702` | Sheriff | Sidearm | 3175 | 6636 |
| `42DA8CCC-40D5-AFFC-BEEC-15AA47B42EDA` | Shorty | Sidearm | 69 | 86 |
| `462080D1-4035-2937-7C09-27AA2A5C27A7` | Spectre | SMG | 919 | 1336 |
| `F7E1B454-4AD4-1063-EC0A-159E56B58941` | Stinger | SMG | 453 | 1137 |
| `910BE174-449B-C412-AB22-D0873436B21B` | Bucky | Shotgun | 70 | 212 |
| `EC845BF4-4F79-DDDA-A3DA-0DB3774B2794` | Judge | Shotgun | 143 | 297 |
| `AE3DE142-4D85-2547-DD26-4E90BED35CF7` | Bulldog | Rifle | 1127 | 1723 |
| `4ADE7FAA-4CF1-8376-95EF-39884480959B` | Guardian | Rifle | 1643 | 2645 |
| `EE8E8D15-496B-07AC-E5F6-8FAE5D4C7B1A` | Phantom | Rifle | 11259 | 14453 |
| `9C82E19D-4575-0200-1A81-3EACF00CF872` | Vandal | Rifle | 17428 | 23012 |
| `8DB0A1BF-4A50-832A-4566-FAAAA6D250CA` | Warden | Rifle | 1 | 1 |
| `C4883E50-4494-202C-3EC3-6B8A9284F00B` | Marshal | Sniper | 237 | 429 |
| `A03B24D3-4319-996D-0F8C-94BBFBA1DFC7` | Operator | Sniper | 1611 | 2089 |
| `5F0AAF7A-4289-3998-D5FF-EB9A5CF7EF5C` | Outlaw | Sniper | 484 | 720 |
| `55D8A0F4-4274-CA67-FE2C-06AB45EFDF58` | Ares | Heavy | 16 | 29 |
| `63E6C2B6-4A8E-869C-3D4C-E38355226584` | Odin | Heavy | 396 | 549 |
| `2F59173C-4BED-B6C3-2191-DEA9B58BE9C7` | Faca (`Confronto` no reference) | Melee | 15 | 0 |

> **Habilidades registradas como `"Weapon"`:** habilidades que funcionam como arma aparecem com `damageType = "Weapon"` e um UUID próprio como `damageItem`. No reference elas têm `categoria = "Ability"`. O agente de quem matou confirma a atribuição:
>
> | UUID (`damageItem`) | Agente | Habilidade | Kills |
> |---------------------|--------|------------|-------|
> | `856D9A7E-4B06-DC37-15DC-9D809C37CB90` | Chamber | Headhunter | 481 |
> | `95336AE4-45D4-1032-CFAF-6BAD01910607` | Neon | Overdrive (ultimate) | 207 |
> | `39099FB5-4293-DEF4-1E09-2E9080CE7456` | Chamber | Tour de Force (ultimate) | 42 |
> | `""` (vazio) | Chamber | não identificada (168 de 169 com `isSecondaryFireMode = true`) | 169 |
>
> Ao analisar armas, separe esses itens pela `categoria` do reference ou trate-os como kills de habilidade.

Quando `damageType = "Ability"`, o valor é um nome de habilidade:

| Valor | Significado |
|-------|-------------|
| `"Ability1"` | Habilidade Q do agente |
| `"Ability2"` | Habilidade E do agente |
| `"GrenadeAbility"` | Habilidade C do agente |
| `"Ultimate"` | Ultimate X do agente |

---

### `roundResults[].playerStats[].damage` — Registro de Dano

Array com um objeto para cada alvo que este jogador causou dano neste round.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `receiver` | `string` | `puuid` do jogador que recebeu o dano |
| `damage` | `int` | Total de pontos de dano causados |
| `headshots` | `int` | Número de tiros na cabeça |
| `bodyshots` | `int` | Número de tiros no corpo |
| `legshots` | `int` | Número de tiros nas pernas |

---

### `roundResults[].playerStats[].economy` — Economia do Round

Estado do inventário e dinheiro do jogador **no início do round**.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `loadoutValue` | `int` | Valor total do equipamento (arma + armadura) em créditos |
| `remaining` | `int` | Créditos restantes após as compras |
| `spent` | `int` | Créditos gastos na fase de compra |
| `weapon` | `string` | UUID da arma principal equipada (ver tabela de armas) |
| `armor` | `string` | UUID da armadura equipada (ver tabela abaixo) |

#### Tabela de Armaduras (`armor`)

| UUID | Armadura | Custo |
|------|----------|-------|
| `4DEC83D5-4902-9AB3-BED6-A7A390761157` | Light Shield (Armadura Leve) | 400 cr |
| `822BCAB2-40A2-324E-C137-E09195AD7692` | Heavy Shield (Armadura Pesada) | 1000 cr |
| `B1B9086D-41BD-A516-5D29-E3B34A6F1644` | Regen Shield (Escudo Regenerativo) | 650 cr |
| `""` (vazio) | Sem armadura | — |

---

### `roundResults[].playerStats[].ability` — Efeitos de Habilidades

Objeto com efeitos especiais registrados pelas habilidades do jogador neste round. **Todos os campos estão `null` neste dataset** — o campo existe estruturalmente mas não possui dados populados.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `grenadeEffects` | `null` | Efeitos da habilidade C |
| `ability1Effects` | `null` | Efeitos da habilidade Q |
| `ability2Effects` | `null` | Efeitos da habilidade E |
| `ultimateEffects` | `null` | Efeitos da ultimate X |

---

## Consistência dos Dados

Verificado em todos os **336 arquivos**:

| Verificação | Resultado |
|-------------|-----------|
| Todas as 5 chaves de topo presentes | ✅ 336/336 arquivos |
| `roundResults` sempre populado | ✅ Nenhum arquivo com 0 rounds |
| `isCompleted` sempre `true` | ✅ Todas as partidas concluídas |
| `gameMode` sempre Spike (Bomb) | ✅ Modo padrão competitivo |
| `region` sempre `"br"` | ✅ Servidor brasileiro |
| Jogadores com `stats = null` | ⚠️ 22 casos — todos são observadores (`isObserver = true`) |
| `coaches` presente | ℹ️ 180/336 arquivos (ausente em alguns torneios) |
| Partidas com overtime | ℹ️ Placar > 13 rounds indica overtime |
| `matchId` único | ✅ 336/336 |
| Placar do nome do arquivo = `teams[].roundsWon` | ✅ 336/336 |
| 5 × 5 jogadores ativos por partida | ✅ 336/336 |
| `roundNum` sequencial, lados trocam no round 13, `stats.roundsPlayed` = nº de rounds | ✅ 336/336 |
| `characterId` e UUIDs de arma/armadura mapeados no reference | ✅ todos |
| Time da esquerda do arquivo = `Red` | ⚠️ só em 160/336: associe pelo placar |
| Itens de `kills` que não são abates (killer = vítima, teamkill) | ⚠️ 382: excluir para bater com `stats.kills` |
| Kills de habilidade como `damageType = "Weapon"` | ⚠️ 899 de Chamber e Neon (730 com UUID de habilidade + 169 sem UUID); ver a nota acima |
| Posição do killer ausente em `playerLocations` | ℹ️ 444 (373 de killer = vítima + 71 sem snapshot do killer) |
| `gameStartMillis` × data do nome do arquivo | ℹ️ 3 partidas diferem em 1 dia (fuso UTC) |
| Mapas jogados | ℹ️ 10. Bind e Icebox não aparecem; Pearl, Breeze e Fracture têm de 2 a 5 partidas |

---

## Dicas para Análise

- **Identificar jogadores**: use `puuid` como chave primária. `gameName + tagLine` podem mudar entre partidas.
- **Calcular ACS**: `stats.score / stats.roundsPlayed` por partida, ou some os `score` de cada round em `roundResults[].playerStats[].score`.
- **KAST**: percorra `roundResults` para identificar rounds onde o jogador fez kill, assist, sobreviveu ou foi tradado.
- **Dano por round (ADR)**: some `damage[].damage` de cada round em `playerStats` e divida por `roundsPlayed`.
- **Headshot %**: some `headshots` e divida por `(headshots + bodyshots + legshots)` em `playerStats[].damage`.
- **Economia**: some `economy.loadoutValue` dos 5 jogadores e classifique a compra do time (critério do vlr.gg, usado em `packages/valorant-data/valorant_data.py`): eco (< 5 mil cr), semi-eco (< 10 mil), semi-buy (< 20 mil) e full buy (≥ 20 mil). Os rounds 1 e 13 são pistol.
- **Posicionamento**: as coordenadas `{x, y}` em `playerLocations`, `victimLocation`, `plantLocation` e `defuseLocation` são comparáveis dentro do mesmo mapa. Para desenhar sobre o minimapa, use a calibração oficial em `reference/map_calibration.json` (valorant-api), que **troca os eixos**: `u = y · xMultiplier + xScalarToAdd` (horizontal) e `v = x · yMultiplier + yScalarToAdd` (vertical), ambos em [0, 1].
