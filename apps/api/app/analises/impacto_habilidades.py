import pandas as pd

from app.analises import TIMES_ROUND, analise, vazio

FASES = {
    "pre": "Abate por habilidade pré-plant",
    "pos": "Abate por habilidade pós-plant",
    "ambas": "Abates por habilidade pré e pós-plant",
    "nenhuma": "Sem abate por habilidade",
}


@analise(
    id="impacto-habilidades",
    titulo="Win rate por fase do abate por habilidade",
    descricao=("Cada observação é uma equipe em um round plantado. Compara a taxa de vitória quando a equipe "
               "tem abate por habilidade só antes do plant, só depois, nas duas fases ou em nenhuma. "
               "Isso não indica quando a habilidade foi usada: a base não registra timestamps de casts."),
    categoria="momentos",
    grafico={"tipo": "barras", "x": "fase_impacto", "y": "win_pct", "serie": "lado",
             "n": "rounds", "indicadores": ["vitorias", "abates_habilidade"],
             "referencia": 50, "rotulo_y": "Win rate por lado · linha tracejada = 50%",
             "rotulo_valor": True},
)
def impacto_habilidades(base, filtros):
    rounds = filtros.aplicar(base.rounds, col_time=TIMES_ROUND)
    plantados = rounds[rounds["houve_plant"]].copy()
    if plantados.empty:
        return vazio()

    observacoes = pd.concat([
        plantados[["match_id", "round", "vencedor_id", "plant_tempo_s", "time_atacante_id"]]
        .rename(columns={"time_atacante_id": "time_id"})
        .assign(lado="Ataque"),
        plantados[["match_id", "round", "vencedor_id", "plant_tempo_s", "time_defensor_id"]]
        .rename(columns={"time_defensor_id": "time_id"})
        .assign(lado="Defesa"),
    ], ignore_index=True)
    observacoes["venceu"] = observacoes["time_id"].eq(observacoes["vencedor_id"])

    equipes_filtradas = filtros.aplicar(base.jogadores)[["match_id", "time_id"]].drop_duplicates()
    observacoes = observacoes.merge(equipes_filtradas, on=["match_id", "time_id"], how="inner")
    if observacoes.empty:
        return vazio()

    abates = base.abates[
        base.abates["valido"] & base.abates["categoria_meio"].eq("Ability")
    ].copy()
    abates = filtros.aplicar(
        abates.assign(agente=abates["agente_killer"], funcao=abates["funcao_killer"]),
        col_time="killer_time_id",
    )
    abates = abates.dropna(subset=["tempo_round_s", "killer_time_id"])
    abates = abates.merge(
        plantados[["match_id", "round", "plant_tempo_s"]],
        on=["match_id", "round"],
        how="inner",
    )
    abates = abates.dropna(subset=["plant_tempo_s"])
    abates["pre_plant"] = abates["tempo_round_s"] < abates["plant_tempo_s"]
    abates["pos_plant"] = abates["tempo_round_s"] >= abates["plant_tempo_s"]
    por_equipe = (
        abates.groupby(["match_id", "round", "killer_time_id"])
        .agg(pre=("pre_plant", "sum"), pos=("pos_plant", "sum"),
             abates_habilidade=("killer_time_id", "size"))
        .reset_index()
        .rename(columns={"killer_time_id": "time_id"})
    )
    observacoes = observacoes.merge(
        por_equipe, on=["match_id", "round", "time_id"], how="left"
    )
    observacoes[["pre", "pos", "abates_habilidade"]] = (
        observacoes[["pre", "pos", "abates_habilidade"]].fillna(0).astype(int)
    )
    observacoes["fase_impacto"] = "Sem abate por habilidade"
    observacoes.loc[observacoes["pre"].gt(0) & observacoes["pos"].eq(0), "fase_impacto"] = FASES["pre"]
    observacoes.loc[observacoes["pre"].eq(0) & observacoes["pos"].gt(0), "fase_impacto"] = FASES["pos"]
    observacoes.loc[observacoes["pre"].gt(0) & observacoes["pos"].gt(0), "fase_impacto"] = FASES["ambas"]

    resultado = (
        observacoes.groupby(["fase_impacto", "lado"], sort=False)
        .agg(rounds=("venceu", "size"), vitorias=("venceu", "sum"),
             abates_habilidade=("abates_habilidade", "sum"), win_pct=("venceu", "mean"))
        .reset_index()
    )
    resultado["win_pct"] *= 100
    insight = (
        "Cada barra mostra a porcentagem de rounds plantados vencidos por aquele lado, conforme a fase dos "
        "abates por habilidade; a linha tracejada marca 50%. Passe o cursor para ver número de rounds, vitórias "
        "e abates. A base registra o abate final, mas não quando a habilidade foi usada; a comparação não "
        "demonstra causalidade."
    )
    return {"dados": resultado, "insight": insight}
