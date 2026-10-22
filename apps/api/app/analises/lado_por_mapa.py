from app.analises import MIN_PARTIDAS_MAPA, TIMES_ROUND, analise, kpi, pct, vazio


@analise(
    id="lado-por-mapa",
    titulo="Ataque ou defesa: quem vence em cada mapa?",
    descricao="% dos rounds vencidos pelo ataque em cada mapa. Abaixo de 50%, o mapa favorece a defesa.",
    categoria="mapas",
    grafico={"tipo": "barras", "x": "mapa", "y": "atk_win_pct", "rotulo_y": "% rounds vencidos pelo ataque",
             "referencia": 50},
)
def lado_por_mapa(base, filtros):
    r = filtros.aplicar(base.rounds, col_time=TIMES_ROUND)
    if r.empty:
        return vazio()
    atk = r["lado_vencedor"].eq("Attacker")
    df = (r.assign(atk=atk).groupby("mapa")
          .agg(partidas=("match_id", "nunique"), rounds=("atk", "size"), atk_win_pct=("atk", "mean"))
          .sort_values("rounds", ascending=False).reset_index())
    df["atk_win_pct"] *= 100

    geral = 100 * atk.mean()
    insight = f"O ataque vence {pct(geral)} dos rounds."
    confiaveis = df[df["partidas"] >= MIN_PARTIDAS_MAPA]
    if len(confiaveis) >= 2:
        defesa = confiaveis.loc[confiaveis["atk_win_pct"].idxmin()]
        ataque = confiaveis.loc[confiaveis["atk_win_pct"].idxmax()]
        insight += (f" Entre os mapas com {MIN_PARTIDAS_MAPA}+ partidas, {defesa['mapa']} é o que mais favorece a "
                    f"defesa (ataque com {pct(defesa['atk_win_pct'])}) e {ataque['mapa']} o que mais favorece "
                    f"o ataque ({pct(ataque['atk_win_pct'])}).")
    return {
        "dados": df,
        "insight": insight,
        "kpi": kpi("Rounds vencidos pelo ataque", geral, "Ataque e defesa estão quase equilibrados."),
    }
