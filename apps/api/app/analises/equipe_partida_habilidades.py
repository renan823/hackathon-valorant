import pandas as pd

from app.analises import MIN_PARTIDAS_MAPA, analise, tercis, vazio

CASTS = ["grenade_casts", "ability1_casts", "ability2_casts", "ultimate_casts"]


@analise(
    id="equipe-partida-habilidades",
    titulo="Atividade de habilidade e vitória da equipe",
    descricao=("Soma os casts do elenco considerado e divide pelos rounds da equipe na partida. Com filtros de "
               "agente/função, a taxa cobre somente os jogadores selecionados; as faixas são tercis por mapa."),
    categoria="jogadores",
    grafico={"tipo": "barras", "x": "faixa_atividade", "y": "win_pct", "serie": "mapa",
             "n": "team_matches", "rotulo_y": "% de partidas vencidas"},
)
def equipe_partida_habilidades(base, filtros):
    jogadores = filtros.aplicar(base.jogadores).copy()
    if jogadores.empty:
        return vazio()
    jogadores[CASTS] = jogadores[CASTS].fillna(0)
    jogadores["casts_total"] = jogadores[CASTS].sum(axis=1)
    equipe_partida = (
        jogadores.groupby(["match_id", "time_id", "mapa"], sort=False)
        .agg(time=("time", "first"), venceu=("venceu", "first"),
             jogadores_considerados=("puuid", "nunique"),
             casts_total=("casts_total", "sum"), rounds_equipe=("rounds_jogados", "first"))
        .reset_index()
    )
    equipe_partida = equipe_partida[equipe_partida["rounds_equipe"].gt(0)].copy()
    if equipe_partida.empty:
        return vazio()
    equipe_partida["casts_por_equipe_round"] = (
        equipe_partida["casts_total"] / equipe_partida["rounds_equipe"]
    )
    equipe_partida["vitorias"] = equipe_partida["venceu"].astype(int)
    equipe_partida["faixa_atividade"] = ""
    for _, indices in equipe_partida.groupby("mapa").groups.items():
        equipe_partida.loc[indices, "faixa_atividade"] = tercis(
            equipe_partida.loc[indices, "casts_por_equipe_round"]
        )

    df = (
        equipe_partida.groupby(["mapa", "faixa_atividade"], sort=False)
        .agg(team_matches=("match_id", "size"), vitorias=("vitorias", "sum"),
             casts_total=("casts_total", "sum"), rounds_equipe=("rounds_equipe", "sum"),
             jogadores_considerados=("jogadores_considerados", "mean"),
             casts_por_equipe_round=("casts_por_equipe_round", "mean"))
        .reset_index()
    )
    df["win_pct"] = 100 * df["vitorias"] / df["team_matches"]
    df.loc[df["team_matches"] < MIN_PARTIDAS_MAPA, "win_pct"] = pd.NA
    df = df.sort_values(
        ["mapa", "faixa_atividade"], key=lambda col: col.map(
            {"Baixa": 0, "Média": 1, "Alta": 2}
        ) if col.name == "faixa_atividade" else col, ignore_index=True
    )
    return {
        "dados": df,
        "insight": (f"Cada observação é uma equipe em uma partida. A atividade é dividida em tercis dentro de cada "
                    f"mapa; filtros de agente/função limitam os casts somados, mas o resultado é o da equipe inteira. "
                    f"O win rate fica oculto abaixo de {MIN_PARTIDAS_MAPA} partidas-equipe por faixa. "
                    "É uma associação observacional e não demonstra causalidade."),
    }
