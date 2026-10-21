from app.analises import TIMES_ROUND, analise, pct, vazio

ORDEM_COMPRA = ["Pistol", "Eco", "Semi-eco", "Semi-buy", "Full buy"]
# A EDA só mostra combinações com pelo menos 30 rounds.
MIN_ROUNDS = 30


@analise(
    id="compras",
    titulo="Vitória do ataque por tipo de compra",
    descricao=("Taxa de vitória do ataque para cada combinação de compra (ataque × defesa), pelo valor total do "
               f"time (critério do vlr.gg). Combinações com menos de {MIN_ROUNDS} rounds são pouco confiáveis."),
    categoria="economia",
    grafico={"tipo": "matriz", "x": "compra_def", "y": "compra_atk", "valor": "atk_win_pct", "n": "rounds",
             "ordem": ORDEM_COMPRA, "min_n": MIN_ROUNDS, "rotulo_x": "Compra da defesa",
             "rotulo_y": "Compra do ataque"},
)
def compras(base, filtros):
    r = filtros.aplicar(base.rounds, col_time=TIMES_ROUND)
    if r.empty:
        return vazio()
    df = (r.assign(atk=r["lado_vencedor"].eq("Attacker")).groupby(["compra_atk", "compra_def"])
          .agg(rounds=("atk", "size"), atk_win_pct=("atk", "mean")).reset_index())
    df["atk_win_pct"] *= 100
    df = df.sort_values(["compra_atk", "compra_def"], key=lambda s: s.map(ORDEM_COMPRA.index), ignore_index=True)

    full = df[(df["compra_atk"] == "Full buy") & (df["compra_def"] == "Full buy")]
    insight = None
    if len(full) and full["rounds"].iloc[0] >= MIN_ROUNDS:
        insight = (f"Com os dois times em full buy, o ataque vence {pct(full['atk_win_pct'].iloc[0])} dos rounds: "
                   "praticamente cara ou coroa. Um time comprado contra um time em eco vence a grande maioria.")
    return {"dados": df, "insight": insight}
