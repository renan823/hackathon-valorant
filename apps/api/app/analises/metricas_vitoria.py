import pandas as pd

from app.analises import analise, vazio
from app.metricas import agregar

METRICAS = ["kast_pct", "kd", "acs", "adr", "kpr", "dpr", "apr", "fk_round", "fd_round", "hs_pct", "casts_round"]
CASTS = ["grenade_casts", "ability1_casts", "ability2_casts", "ultimate_casts"]


@analise(
    id="metricas-vitoria",
    titulo="Qual métrica individual mais se associa à vitória?",
    descricao=("Correlação ponto-bisserial (Pearson com uma variável 0/1) entre cada métrica do jogador na "
               "partida e a vitória do time. Correlação não é causalidade: quem vence sobrevive mais rounds."),
    categoria="jogadores",
    grafico={"tipo": "barras", "x": "metrica", "y": "r", "rotulo_y": "Correlação com a vitória", "referencia": 0},
)
def metricas_vitoria(base, filtros):
    j = filtros.aplicar(base.jogadores)
    if j["venceu"].nunique() < 2:
        return vazio()
    m = agregar(j, ["match_id", "puuid"]).merge(j[["match_id", "puuid", "venceu", *CASTS]], on=["match_id", "puuid"])
    m["casts_round"] = m[CASTS].sum(axis=1) / m["rounds"]
    venceu = m["venceu"].astype(float)
    df = pd.DataFrame([
        {"metrica": c, "r": m[c].corr(venceu),
         "media_vitoria": m.loc[m["venceu"], c].mean(), "media_derrota": m.loc[~m["venceu"], c].mean()}
        for c in METRICAS
    ]).sort_values("r", ascending=False, ignore_index=True)
    topo = df.iloc[0]
    r = f"{topo['r']:.2f}".replace(".", ",")
    if topo["metrica"] == "kast_pct":
        insight = (f"O KAST é a métrica individual mais ligada à vitória (r ≈ {r}), acima de KD e ACS: "
                   "consistência e jogo coletivo pesam mais que abates.")
    else:
        insight = f"{topo['metrica']} é a métrica individual mais ligada à vitória (r ≈ {r})."
    return {"dados": df, "insight": insight}
