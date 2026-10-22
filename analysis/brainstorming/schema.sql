-- Schema relacional para o JSON de partida do Valorant (SQL padrão / compatível com Postgres e DuckDB)

CREATE TABLE match (
    match_id            VARCHAR PRIMARY KEY,
    map_id              VARCHAR,
    game_version        VARCHAR,
    game_length_ms      BIGINT,
    region              VARCHAR,
    game_start_ms       BIGINT,          -- epoch em milissegundos
    provisioning_flow   VARCHAR,
    is_completed        BOOLEAN,
    custom_game_name    VARCHAR,
    queue_id            VARCHAR,
    game_mode           VARCHAR,
    is_ranked           BOOLEAN,
    season_id           VARCHAR
);

CREATE TABLE team (
    match_id      VARCHAR REFERENCES match(match_id),
    team_id       VARCHAR,               -- 'Blue' | 'Red'
    won           BOOLEAN,
    rank          INTEGER,
    rounds_played INTEGER,
    rounds_won    INTEGER,
    num_points    INTEGER,
    PRIMARY KEY (match_id, team_id)
);

CREATE TABLE player (
    puuid       VARCHAR PRIMARY KEY,
    game_name   VARCHAR,
    tag_line    VARCHAR
);

-- participação de um jogador numa partida (+ stats agregadas)
CREATE TABLE match_player (
    match_id         VARCHAR,
    puuid            VARCHAR REFERENCES player(puuid),
    team_id          VARCHAR,
    party_id         VARCHAR,
    character_id     VARCHAR,            -- UUID do agente
    competitive_tier INTEGER,
    account_level    INTEGER,
    player_card      VARCHAR,
    player_title     VARCHAR,
    is_observer      BOOLEAN,
    score            INTEGER,
    rounds_played    INTEGER,
    kills            INTEGER,
    deaths           INTEGER,
    assists          INTEGER,
    playtime_ms      BIGINT,
    grenade_casts    INTEGER,
    ability1_casts   INTEGER,
    ability2_casts   INTEGER,
    ultimate_casts   INTEGER,
    PRIMARY KEY (match_id, puuid),
    FOREIGN KEY (match_id, team_id) REFERENCES team(match_id, team_id)
);

CREATE TABLE round (
    match_id            VARCHAR,
    round_num           INTEGER,
    result              VARCHAR,         -- Eliminated | Bomb defused | Bomb detonated
    result_code         VARCHAR,         -- Elimination | Defuse | Detonate
    ceremony            VARCHAR,
    winning_team        VARCHAR,
    winning_team_role   VARCHAR,         -- Attacker | Defender
    bomb_planter        VARCHAR,         -- NULL se não houve plant
    plant_site          VARCHAR,         -- NULL se não houve plant
    plant_round_time_ms INTEGER,
    plant_x             INTEGER,
    plant_y             INTEGER,
    bomb_defuser        VARCHAR,         -- NULL se não houve defuse
    defuse_round_time_ms INTEGER,
    defuse_x            INTEGER,
    defuse_y            INTEGER,
    PRIMARY KEY (match_id, round_num),
    FOREIGN KEY (match_id) REFERENCES match(match_id)
);

-- 1 linha por jogador por round (10 x 22 = 220)
CREATE TABLE round_player (
    match_id       VARCHAR,
    round_num      INTEGER,
    puuid          VARCHAR,
    score          INTEGER,
    loadout_value  INTEGER,
    weapon_id      VARCHAR,
    armor_id       VARCHAR,              -- NULL = sem armadura
    credits_remaining INTEGER,
    credits_spent  INTEGER,
    PRIMARY KEY (match_id, round_num, puuid),
    FOREIGN KEY (match_id, round_num) REFERENCES round(match_id, round_num),
    FOREIGN KEY (match_id, puuid)     REFERENCES match_player(match_id, puuid)
);

-- dano causado (atacante = quem tem o playerStats; receiver = alvo)
CREATE TABLE damage (
    match_id   VARCHAR,
    round_num  INTEGER,
    dealer     VARCHAR,
    receiver   VARCHAR,
    damage     INTEGER,
    headshots  INTEGER,
    bodyshots  INTEGER,
    legshots   INTEGER,
    PRIMARY KEY (match_id, round_num, dealer, receiver),
    FOREIGN KEY (match_id, round_num, dealer) REFERENCES round_player(match_id, round_num, puuid)
);

CREATE TABLE kill (
    kill_id                BIGINT PRIMARY KEY,  -- surrogate (o JSON não tem id)
    match_id               VARCHAR,
    round_num              INTEGER,
    killer                 VARCHAR,
    victim                 VARCHAR,
    time_since_game_ms     INTEGER,
    time_since_round_ms    INTEGER,
    victim_x               INTEGER,
    victim_y               INTEGER,
    damage_type            VARCHAR,
    damage_item            VARCHAR,          -- UUID da arma / habilidade
    is_secondary_fire_mode BOOLEAN,
    FOREIGN KEY (match_id, round_num) REFERENCES round(match_id, round_num)
);

CREATE TABLE kill_assistant (
    kill_id  BIGINT REFERENCES kill(kill_id),
    puuid    VARCHAR,
    PRIMARY KEY (kill_id, puuid)
);

-- "snapshot" de posição/mira de todos os jogadores vivos no momento do kill, plant ou defuse
CREATE TABLE player_location (
    match_id     VARCHAR,
    round_num    INTEGER,
    event_type   VARCHAR,                -- 'kill' | 'plant' | 'defuse'
    kill_id      BIGINT,                 -- preenchido só quando event_type = 'kill'
    puuid        VARCHAR,
    view_radians DOUBLE PRECISION,
    x            INTEGER,
    y            INTEGER
);

CREATE INDEX idx_kill_round ON kill(match_id, round_num);
CREATE INDEX idx_kill_killer ON kill(killer);
CREATE INDEX idx_loc_kill ON player_location(kill_id);