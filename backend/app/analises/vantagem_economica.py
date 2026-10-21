import pandas as pd

from app.analises import TIMES_ROUND, analise, pct, vazio

# Mesmas faixas da EDA (seção 10.4): vantagem de loadout do ataque, em créditos.
FAIXAS = [-40000, -15000, -10000, -5000, -2000, 2000, 5000, 10000, 15000, 40000]


def _rotulo(intervalo):
    return f"{intervalo.left / 1000:+.0f} mil a {intervalo.right / 1000:+.0f} mil"


@analise(
    id="vantagem-economica",
    titulo="Vantagem de equipamento × vitória do round",
    descricao="Taxa de vitória do ataque por diferença de loadout (ataque − defesa), sem pistol rounds.",
    categoria="economia",
    grafico={"tipo": "linha", "x": "vantagem_media", "y": "atk_win_pct",
             "rotulo_x": "Vantagem de loadout do ataque (créditos)", "rotulo_y": "% rounds vencidos pelo ataque",
             "referencia": 50},
)
def vantagem_economica(base, filtros):
    r = filtros.aplicar(base.rounds, col_time=TIMES_ROUND)
    r = r[~r["pistol"]]
    if r.empty:
        return vazio()
    r = r.assign(vantagem=r["loadout_atk"] - r["loadout_def"], atk=r["lado_vencedor"].eq("Attacker"))
    r["faixa"] = pd.cut(r["vantagem"], bins=FAIXAS)
    df = (r.groupby("faixa", observed=True)
          .agg(vantagem_media=("vantagem", "mean"), atk_win_pct=("atk", "mean"), rounds=("atk", "size"))
          .reset_index())
    df["atk_win_pct"] *= 100
    df["faixa"] = df["faixa"].map(_rotulo)

    centro = df[df["faixa"] == _rotulo(pd.Interval(-2000, 2000))]["atk_win_pct"]
    insight = "A curva tem formato de S: o efeito da vantagem de equipamento satura nos extremos."
    if len(centro) and len(df) >= 3:
        insight = (f"Com equipamento equivalente (±2 mil créditos) o round é equilibrado ({pct(centro.iloc[0])} para o "
                   f"ataque); nos extremos o efeito satura entre {pct(df['atk_win_pct'].iloc[0])} e "
                   f"{pct(df['atk_win_pct'].iloc[-1])}. A curva tem formato de S.")
    return {"dados": df, "insight": insight}
