import json
from pathlib import Path
import sqlite3


def init_db(conn: sqlite3.Connection):
    """Cria a estrutura de tabelas relacionais completa no SQLite."""
    cursor = conn.cursor()
    cursor.execute("PRAGMA foreign_keys = ON;")

    cursor.execute(
        """
    CREATE TABLE IF NOT EXISTS match (
        match_id            VARCHAR PRIMARY KEY,
        map_id              VARCHAR,
        game_version        VARCHAR,
        game_length_ms      BIGINT,
        region              VARCHAR,
        game_start_ms       BIGINT,
        provisioning_flow   VARCHAR,
        is_completed        BOOLEAN,
        custom_game_name    VARCHAR,
        queue_id            VARCHAR,
        game_mode           VARCHAR,
        is_ranked           BOOLEAN,
        season_id           VARCHAR
    )
    """
    )

    cursor.execute(
        """
    CREATE TABLE IF NOT EXISTS team (
        match_id      VARCHAR REFERENCES match(match_id),
        team_id       VARCHAR,
        won           BOOLEAN,
        rank          INTEGER,
        rounds_played INTEGER,
        rounds_won    INTEGER,
        num_points    INTEGER,
        PRIMARY KEY (match_id, team_id)
    )
    """
    )

    cursor.execute(
        """
    CREATE TABLE IF NOT EXISTS player (
        puuid       VARCHAR PRIMARY KEY,
        game_name   VARCHAR,
        tag_line    VARCHAR
    )
    """
    )

    cursor.execute(
        """
    CREATE TABLE IF NOT EXISTS match_player (
        match_id         VARCHAR,
        puuid            VARCHAR REFERENCES player(puuid),
        team_id          VARCHAR,
        party_id         VARCHAR,
        character_id     VARCHAR,
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
    )
    """
    )

    cursor.execute(
        """
    CREATE TABLE IF NOT EXISTS round (
        match_id            VARCHAR,
        round_num           INTEGER,
        result              VARCHAR,
        result_code         VARCHAR,
        ceremony            VARCHAR,
        winning_team        VARCHAR,
        winning_team_role   VARCHAR,
        bomb_planter        VARCHAR,
        plant_site          VARCHAR,
        plant_round_time_ms INTEGER,
        plant_x             INTEGER,
        plant_y             INTEGER,
        bomb_defuser        VARCHAR,
        defuse_round_time_ms INTEGER,
        defuse_x            INTEGER,
        defuse_y            INTEGER,
        PRIMARY KEY (match_id, round_num),
        FOREIGN KEY (match_id) REFERENCES match(match_id)
    )
    """
    )

    cursor.execute(
        """
    CREATE TABLE IF NOT EXISTS round_player (
        match_id          VARCHAR,
        round_num         INTEGER,
        puuid             VARCHAR,
        score             INTEGER,
        loadout_value     INTEGER,
        weapon_id         VARCHAR,
        armor_id          VARCHAR,
        credits_remaining INTEGER,
        credits_spent     INTEGER,
        PRIMARY KEY (match_id, round_num, puuid),
        FOREIGN KEY (match_id, round_num) REFERENCES round(match_id, round_num),
        FOREIGN KEY (match_id, puuid)     REFERENCES match_player(match_id, puuid)
    )
    """
    )

    cursor.execute(
        """
    CREATE TABLE IF NOT EXISTS damage (
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
    )
    """
    )

    cursor.execute(
        """
    CREATE TABLE IF NOT EXISTS kill (
        kill_id                INTEGER PRIMARY KEY AUTOINCREMENT,
        match_id               VARCHAR,
        round_num              INTEGER,
        killer                 VARCHAR,
        victim                 VARCHAR,
        time_since_game_ms     INTEGER,
        time_since_round_ms    INTEGER,
        victim_x               INTEGER,
        victim_y               INTEGER,
        damage_type            VARCHAR,
        damage_item            VARCHAR,
        is_secondary_fire_mode BOOLEAN,
        FOREIGN KEY (match_id, round_num) REFERENCES round(match_id, round_num)
    )
    """
    )

    cursor.execute(
        """
    CREATE TABLE IF NOT EXISTS kill_assistant (
        kill_id  BIGINT REFERENCES kill(kill_id),
        puuid    VARCHAR,
        PRIMARY KEY (kill_id, puuid)
    )
    """
    )

    cursor.execute(
        """
    CREATE TABLE IF NOT EXISTS player_location (
        match_id     VARCHAR,
        round_num    INTEGER,
        event_type   VARCHAR,
        kill_id      BIGINT,
        puuid        VARCHAR,
        view_radians REAL,
        x            INTEGER,
        y            INTEGER
    )
    """
    )

    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_kill_round ON kill(match_id, round_num);"
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_kill_killer ON kill(killer);"
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_loc_kill ON player_location(kill_id);"
    )

    conn.commit()


def process_json_file(file_path: Path, conn: sqlite3.Connection):
    """Mapeia os dados do ficheiro JSON para o schema relacional."""
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    match_info = data.get("matchInfo", {})
    match_id = match_info.get("matchId")
    if not match_id:
        return

    cursor = conn.cursor()

    # 1. Tabela match
    cursor.execute(
        """
        INSERT OR REPLACE INTO match VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """,
        (
            match_id,
            match_info.get("mapId"),
            match_info.get("gameVersion"),
            match_info.get("gameLengthMillis"),
            match_info.get("region"),
            match_info.get("gameStartMillis"),
            match_info.get("provisioningFlowId"),
            match_info.get("isCompleted"),
            match_info.get("customGameName"),
            match_info.get("queueId"),
            match_info.get("gameMode"),
            match_info.get("isRanked"),
            match_info.get("seasonId"),
        ),
    )

    # 2. Tabela team
    for team in data.get("teams", []):
        cursor.execute(
            """
            INSERT OR REPLACE INTO team VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
            (
                match_id,
                team.get("teamId"),
                team.get("won"),
                team.get("rank"),
                team.get("roundsPlayed"),
                team.get("roundsWon"),
                team.get("numPoints"),
            ),
        )

    # 3. Tabelas player e match_player
    for player in data.get("players", []):
        puuid = player.get("puuid")
        cursor.execute(
            """
            INSERT OR REPLACE INTO player VALUES (?, ?, ?)
        """,
            (puuid, player.get("gameName"), player.get("tagLine")),
        )

        stats = player.get("stats", {}) or {}
        casts = stats.get("abilityCasts", {}) or {}

        cursor.execute(
            """
            INSERT OR REPLACE INTO match_player VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            )
        """,
            (
                match_id,
                puuid,
                player.get("teamId"),
                player.get("partyId"),
                player.get("characterId"),
                player.get("competitiveTier"),
                player.get("accountLevel"),
                player.get("playerCard"),
                player.get("playerTitle"),
                player.get("isObserver"),
                stats.get("score"),
                stats.get("roundsPlayed"),
                stats.get("kills"),
                stats.get("deaths"),
                stats.get("assists"),
                stats.get("playtimeMillis"),
                casts.get("grenadeCasts"),
                casts.get("ability1Casts"),
                casts.get("ability2Casts"),
                casts.get("ultimateCasts"),
            ),
        )

    # 4. Tabelas round, round_player, damage, kill, kill_assistant, player_location
    for round_res in data.get("roundResults", []):
        round_num = round_res.get("roundNum")

        plant_x, plant_y = None, None
        plant_locs = round_res.get("plantPlayerLocations") or []
        for pl in plant_locs:
            if pl.get("puuid") == round_res.get("bombPlanter"):
                loc = pl.get("location", {})
                plant_x, plant_y = loc.get("x"), loc.get("y")

        defuse_x, defuse_y = None, None
        defuse_locs = round_res.get("defusePlayerLocations") or []
        for dl in defuse_locs:
            if dl.get("puuid") == round_res.get("bombDefuser"):
                loc = dl.get("location", {})
                defuse_x, defuse_y = loc.get("x"), loc.get("y")

        cursor.execute(
            """
            INSERT OR REPLACE INTO round VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (
                match_id,
                round_num,
                round_res.get("roundResult"),
                round_res.get("roundResultCode"),
                round_res.get("ceremony"),
                round_res.get("winningTeam"),
                round_res.get("winningTeamRole"),
                round_res.get("bombPlanter"),
                round_res.get("plantSite"),
                round_res.get("plantRoundTime"),
                plant_x,
                plant_y,
                round_res.get("bombDefuser"),
                round_res.get("defuseRoundTime"),
                defuse_x,
                defuse_y,
            ),
        )

        for pl in plant_locs:
            loc = pl.get("location", {})
            cursor.execute(
                """
                INSERT INTO player_location (match_id, round_num, event_type, puuid, view_radians, x, y)
                VALUES (?, ?, 'plant', ?, ?, ?, ?)
            """,
                (
                    match_id,
                    round_num,
                    pl.get("puuid"),
                    pl.get("viewRadians"),
                    loc.get("x"),
                    loc.get("y"),
                ),
            )

        for dl in defuse_locs:
            loc = dl.get("location", {})
            cursor.execute(
                """
                INSERT INTO player_location (match_id, round_num, event_type, puuid, view_radians, x, y)
                VALUES (?, ?, 'defuse', ?, ?, ?, ?)
            """,
                (
                    match_id,
                    round_num,
                    dl.get("puuid"),
                    dl.get("viewRadians"),
                    loc.get("x"),
                    loc.get("y"),
                ),
            )

        for pstat in round_res.get("playerStats", []):
            puuid = pstat.get("puuid")
            econ = pstat.get("economy", {}) or {}

            cursor.execute(
                """
                INSERT OR REPLACE INTO round_player VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    match_id,
                    round_num,
                    puuid,
                    pstat.get("score"),
                    econ.get("loadoutValue"),
                    econ.get("weapon"),
                    econ.get("armor"),
                    econ.get("remaining"),
                    econ.get("spent"),
                ),
            )

            for dmg in pstat.get("damage", []):
                cursor.execute(
                    """
                    INSERT OR REPLACE INTO damage VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                    (
                        match_id,
                        round_num,
                        puuid,
                        dmg.get("receiver"),
                        dmg.get("damage"),
                        dmg.get("headshots"),
                        dmg.get("bodyshots"),
                        dmg.get("legshots"),
                    ),
                )

            for k in pstat.get("kills", []):
                v_loc = k.get("victimLocation", {}) or {}
                f_dmg = k.get("finishingDamage", {}) or {}

                cursor.execute(
                    """
                    INSERT INTO kill (
                        match_id, round_num, killer, victim, time_since_game_ms,
                        time_since_round_ms, victim_x, victim_y, damage_type,
                        damage_item, is_secondary_fire_mode
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                    (
                        match_id,
                        round_num,
                        k.get("killer"),
                        k.get("victim"),
                        k.get("timeSinceGameMillis"),
                        k.get("timeSinceRoundMillis"),
                        v_loc.get("x"),
                        v_loc.get("y"),
                        f_dmg.get("damageType"),
                        f_dmg.get("damageItem"),
                        f_dmg.get("isSecondaryFireMode"),
                    ),
                )
                kill_id = cursor.lastrowid

                for ast in k.get("assistants", []):
                    cursor.execute(
                        """
                        INSERT OR REPLACE INTO kill_assistant VALUES (?, ?)
                    """,
                        (kill_id, ast),
                    )

                for ploc in k.get("playerLocations", []):
                    loc = ploc.get("location", {}) or {}
                    cursor.execute(
                        """
                        INSERT INTO player_location (
                            match_id, round_num, event_type, kill_id, puuid, view_radians, x, y
                        ) VALUES (?, ?, 'kill', ?, ?, ?, ?, ?)
                    """,
                        (
                            match_id,
                            round_num,
                            kill_id,
                            ploc.get("puuid"),
                            ploc.get("viewRadians"),
                            loc.get("x"),
                            loc.get("y"),
                        ),
                    )

    conn.commit()


def run_etl(folder_path: str = "./data", db_path: str = "valorant.db"):
    """Varre a pasta base e todas as suas subpastas procurando ficheiros .json."""
    conn = sqlite3.connect(db_path)
    init_db(conn)

    base_path = Path(folder_path)
    # Procurar recursivamente por todos os ficheiros .json
    json_files = list(base_path.rglob("*.json"))

    print(
        f"Encontrados {len(json_files)} ficheiros JSON em '{folder_path}' e subpastas."
    )

    for file_path in json_files:
        try:
            process_json_file(file_path, conn)
            # Mostra o caminho relativo para melhor legibilidade
            rel_path = file_path.relative_to(base_path)
            print(f"Processado: {rel_path}")
        except Exception as e:
            print(f"Erro ao processar {file_path}: {e}")

    conn.close()
    print("Processo ETL concluído com sucesso!")


if __name__ == "__main__":
    run_etl("./data")