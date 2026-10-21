import pandas as pd

from app.analises import TIMES_ROUND, analise, kpi, pct, vazio


@analise(
    id="pistol",
    titulo="Quem vence o pistol converte o round seguinte?",
    descricao="% de vezes em que o vencedor do pistol (rounds 1 e 13) também vence o round seguinte.",
    categoria="momentos",
    grafico={"tipo": "kpi", "x": "pistol", "y": "conversao_pct"},
)
def pistol(base, filtros):
    r = filtros.aplicar(base.rounds, col_time=TIMES_ROUND)
    vencedor = r.set_index(["match_id", "round"])["vencedor_id"]
    p = r[r["pistol"]][["match_id", "round", "vencedor_id"]]
    seguinte = vencedor.reindex(pd.MultiIndex.from_arrays([p["match_id"], p["round"] + 1])).to_numpy()
    p = p.assign(converteu=seguinte == p["vencedor_id"].to_numpy())[pd.notna(seguinte)]
    if p.empty:
        return vazio()

    linhas = [("1º pistol (round 1)", p[p["round"] == 1]), ("2º pistol (round 13)", p[p["round"] == 13]),
              ("Total", p)]
    dados = pd.DataFrame([{"pistol": nome, "rounds": len(g), "conversao_pct": 100 * g["converteu"].mean()}
                          for nome, g in linhas if len(g)])
    total = 100 * p["converteu"].mean()
    return {
        "dados": dados,
        "insight": (f"O vencedor do pistol vence também o round seguinte em {pct(total)} das vezes: "
                    "quem perde fica sem dinheiro para comprar."),
        "kpi": kpi("Pistol convertido no round seguinte", total, "Na prática, o pistol vale dois rounds."),
    }
