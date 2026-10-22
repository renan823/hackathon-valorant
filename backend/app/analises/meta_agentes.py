from app.analises import analise, vazio


@analise(
    id="meta-agentes",
    titulo="Meta de agentes por mapa",
    descricao="Pick rate (% dos times que escolheram o agente no mapa) e taxa de vitória de cada agente.",
    categoria="meta",
    grafico={"tipo": "tabela",
             "colunas": ["mapa", "agente", "funcao", "escolhas", "pick_rate", "win_pct", "partidas_mapa"]},
)
def meta_agentes(base, filtros):
    j = filtros.aplicar(base.jogadores)
    if j.empty:
        return vazio()
    # Denominador do pick rate: quantos times (partida × time) jogaram cada mapa.
    times_no_mapa = j.drop_duplicates(["match_id", "time_id"]).groupby("mapa").size()
    df = (j.groupby(["mapa", "agente", "funcao"])
          .agg(escolhas=("puuid", "size"), vitorias=("venceu", "sum")).reset_index())
    df["partidas_mapa"] = df["mapa"].map(j.groupby("mapa")["match_id"].nunique())
    df["pick_rate"] = 100 * df["escolhas"] / df["mapa"].map(times_no_mapa)
    df["win_pct"] = 100 * df["vitorias"] / df["escolhas"]
    df = df.sort_values(["partidas_mapa", "mapa", "escolhas"], ascending=[False, True, False], ignore_index=True)

    geral = j["agente"].value_counts()
    return {
        "dados": df,
        "insight": (f"{geral.index[0]} é o agente mais escolhido ({geral.iloc[0]} escolhas), seguido por "
                    f"{geral.index[1]} e {geral.index[2]}." if len(geral) >= 3 else None),
    }
