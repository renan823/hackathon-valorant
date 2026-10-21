from app.analises import TIMES_ROUND, analise, pct, vazio

# Abaixo disso, a taxa de vitória após o plant num site é pouco confiável.
MIN_PLANTS = 30


@analise(
    id="plant-sites",
    titulo="Onde a spike é plantada em cada mapa?",
    descricao="Plants por site em cada mapa e a taxa de vitória do ataque depois de plantar ali.",
    categoria="mapas",
    grafico={"tipo": "barras", "x": "plant_site", "y": "plants", "serie": "mapa", "rotulo_y": "Plants"},
)
def plant_sites(base, filtros):
    r = filtros.aplicar(base.rounds, col_time=TIMES_ROUND)
    r = r[r["houve_plant"]]
    if r.empty:
        return vazio()
    df = (r.assign(atk=r["lado_vencedor"].eq("Attacker")).groupby(["mapa", "plant_site"])
          .agg(plants=("atk", "size"), atk_win_pct=("atk", "mean")).reset_index())
    df["atk_win_pct"] *= 100
    df["pct_do_mapa"] = 100 * df["plants"] / df.groupby("mapa")["plants"].transform("sum")
    df["partidas_mapa"] = df["mapa"].map(r.groupby("mapa")["match_id"].nunique())
    df = df.sort_values(["partidas_mapa", "mapa", "plant_site"], ascending=[False, True, True], ignore_index=True)

    geral = 100 * r["lado_vencedor"].eq("Attacker").mean()
    insight = f"Depois de plantar a spike, o ataque vence {pct(geral)} dos rounds."
    confiaveis = df[df["plants"] >= MIN_PLANTS]
    if len(confiaveis):
        melhor = confiaveis.loc[confiaveis["atk_win_pct"].idxmax()]
        insight += (f" O site mais convertido é o {melhor['plant_site']} de {melhor['mapa']} "
                    f"({pct(melhor['atk_win_pct'])} em {melhor['plants']} plants).")
    return {"dados": df, "insight": insight}
