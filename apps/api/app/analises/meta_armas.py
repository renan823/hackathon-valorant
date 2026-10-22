from app.analises import analise, kpi, pct, vazio


@analise(
    id="meta-armas",
    titulo="Quais armas mais matam?",
    descricao="Participação de cada arma (ou habilidade) nos abates válidos. Filtros de agente e time valem para quem matou.",
    categoria="meta",
    grafico={"tipo": "barras", "x": "meio", "y": "pct", "serie": "categoria_meio", "rotulo_y": "% dos abates"},
)
def meta_armas(base, filtros):
    a = base.abates[base.abates["valido"]]
    a = filtros.aplicar(a.assign(agente=a["agente_killer"], funcao=a["funcao_killer"]), col_time="killer_time_id")
    if a.empty:
        return vazio()
    df = (a.groupby(["meio", "categoria_meio"]).size().rename("kills").reset_index()
          .sort_values("kills", ascending=False, ignore_index=True))
    df["pct"] = 100 * df["kills"] / df["kills"].sum()

    rifles = df[df["meio"].isin(["Vandal", "Phantom"])]["pct"].sum()
    topo = df.iloc[0]
    return {
        "dados": df,
        "insight": (f"Vandal e Phantom respondem por {pct(rifles)} dos abates; a mais usada é a {topo['meio']} "
                    f"({pct(topo['pct'])})."),
        "kpi": kpi("Abates com Vandal ou Phantom", rifles, f"A {topo['meio']} lidera com {pct(topo['pct'])}."),
    }
