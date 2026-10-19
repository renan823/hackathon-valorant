import marimo

__generated_with = "0.25.1"
app = marimo.App(width="medium")


@app.cell
def _():
    import marimo as mo
    import sqlalchemy

    return mo, sqlalchemy


@app.cell
def _(sqlalchemy):
    DATABASE_URL = "sqlite:///valorant.db"
    engine = sqlalchemy.create_engine(DATABASE_URL)
    return (engine,)


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ## Partidas por mapa e taxa de vitórias por lado
    """)
    return


@app.cell
def _(engine, mo):
    _df = mo.sql(
        f"""
        SELECT 
            m.map_id,
            COUNT(DISTINCT m.match_id) AS total_partidas,
            ROUND(AVG(m.game_length_ms) / 60000.0, 2) AS duracao_media_min,
            SUM(CASE WHEN t.team_id = 'Blue' AND t.won THEN 1 ELSE 0 END) AS vitorias_blue,
            SUM(CASE WHEN t.team_id = 'Red' AND t.won THEN 1 ELSE 0 END) AS vitorias_red
        FROM match m
        JOIN team t ON m.match_id = t.match_id
        GROUP BY m.map_id
        ORDER BY total_partidas DESC;
        """,
        engine=engine
    )
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ## Leaderboard de Jogadores (KDA, Pontuação e Precisão)
    """)
    return


@app.cell
def _(engine, mo):
    _df = mo.sql(
        f"""
        SELECT 
            p.game_name || '#' || p.tag_line AS jogador,
            COUNT(DISTINCT mp.match_id) AS partidas_jogadas,
            ROUND(AVG(mp.score), 0) AS avg_score,
            SUM(mp.kills) AS total_kills,
            SUM(mp.deaths) AS total_deaths,
            SUM(mp.assists) AS total_assists,
            ROUND(CAST(SUM(mp.kills) AS FLOAT) / NULLIF(SUM(mp.deaths), 0), 2) AS kd_ratio,
            ROUND(
                CAST(SUM(d.headshots) AS FLOAT) * 100.0 / 
                NULLIF(SUM(d.headshots + d.bodyshots + d.legshots), 0), 2
            ) AS headshot_pct
        FROM match_player mp
        JOIN player p ON mp.puuid = p.puuid
        LEFT JOIN damage d ON mp.match_id = d.match_id AND mp.puuid = d.dealer
        GROUP BY p.puuid, p.game_name, p.tag_line
        HAVING COUNT(DISTINCT mp.match_id) >= 3
        ORDER BY avg_score DESC;
        """,
        engine=engine
    )
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ## Meta de Agentes por Mapa (Pick Rate e Taxa de Vitória)
    """)
    return


@app.cell
def _(engine, mo):
    _df = mo.sql(
        f"""
        SELECT 
            m.map_id,
            mp.character_id AS agente,
            COUNT(mp.puuid) AS vezes_escolhido,
            ROUND(
                COUNT(mp.puuid) * 100.0 / SUM(COUNT(mp.puuid)) OVER (PARTITION BY m.map_id), 2
            ) AS pick_rate_pct,
            ROUND(
                SUM(CASE WHEN t.won THEN 1 ELSE 0 END) * 100.0 / COUNT(mp.puuid), 2
            ) AS win_rate_pct
        FROM match_player mp
        JOIN match m ON mp.match_id = m.match_id
        JOIN team t ON mp.match_id = t.match_id AND mp.team_id = t.team_id
        GROUP BY m.map_id, mp.character_id
        ORDER BY m.map_id, vezes_escolhido DESC;
        """,
        engine=engine
    )
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ## Análise Tática: Locais de Plant da Spike por Mapa
    """)
    return


@app.cell
def _(engine, mo):
    _df = mo.sql(
        f"""
        SELECT 
            m.map_id,
            r.plant_site,
            COUNT(r.round_num) AS total_plants,
            SUM(CASE WHEN r.winning_team_role = 'Attacker' THEN 1 ELSE 0 END) AS vitorias_atacantes,
            ROUND(
                SUM(CASE WHEN r.winning_team_role = 'Attacker' THEN 1 ELSE 0 END) * 100.0 / COUNT(r.round_num), 2
            ) AS conversao_vitoria_pct
        FROM round r
        JOIN match m ON r.match_id = m.match_id
        WHERE r.plant_site IS NOT NULL AND r.plant_site != ''
        GROUP BY m.map_id, r.plant_site
        ORDER BY m.map_id, total_plants DESC;
        """,
        engine=engine
    )
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ## Análise Econômica: Investimento no Round vs Vitória
    """)
    return


@app.cell
def _(engine, mo):
    _df = mo.sql(
        f"""
        WITH team_economy AS (
            SELECT 
                rp.match_id,
                rp.round_num,
                mp.team_id,
                SUM(rp.loadout_value) AS valor_equipe,
                r.winning_team
            FROM round_player rp
            JOIN match_player mp ON rp.match_id = mp.match_id AND rp.puuid = mp.puuid
            JOIN round r ON rp.match_id = r.match_id AND rp.round_num = r.round_num
            GROUP BY rp.match_id, rp.round_num, mp.team_id, r.winning_team
        )
        SELECT 
            CASE 
                WHEN valor_equipe < 10000 THEN '1. Eco (< 10k)'
                WHEN valor_equipe BETWEEN 10000 AND 19999 THEN '2. Semi-Buy (10k-20k)'
                ELSE '3. Full Buy (> 20k)'
            END AS faixa_economica,
            COUNT(*) AS total_rounds_time,
            SUM(CASE WHEN team_id = winning_team THEN 1 ELSE 0 END) AS rounds_vencidos,
            ROUND(
                SUM(CASE WHEN team_id = winning_team THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2
            ) AS taxa_vitoria_pct
        FROM team_economy
        GROUP BY faixa_economica
        ORDER BY faixa_economica;
        """,
        engine=engine
    )
    return


if __name__ == "__main__":
    app.run()
