import pandas as pd

from app.analises import TIMES_ROUND, analise, vazio

CATEGORIAS = {
    "primeiro": "Habilidade fez o primeiro abate",
    "outro": "Habilidade fez outro abate",
    "nenhum": "Nenhum abate por habilidade",
}


@analise(
    id="conversao-habilidades",
    titulo="Win rate conforme o abate por habilidade abre o round",
    descricao=("Cada observação é uma equipe em um round. Compara a taxa de vitória quando o primeiro abate "
               "da equipe foi finalizado por habilidade, quando houve abate por habilidade mas não foi o "
               "primeiro, ou quando não houve abate por habilidade. São abates finais, não casts."),
    categoria="momentos",
    grafico={"tipo": "barras", "x": "situacao_habilidade", "y": "win_pct", "serie": "lado",
             "n": "team_rounds", "indicadores": ["vitorias", "abates_habilidade"],
             "referencia": 50, "rotulo_y": "Win rate por lado · linha tracejada = 50%",
             "rotulo_valor": True},
)
def conversao_habilidades(base, filtros):
    rounds = filtros.aplicar(base.rounds, col_time=TIMES_ROUND)
    if rounds.empty:
        return vazio()

    equipes_elegiveis = filtros.aplicar(base.jogadores)[["match_id", "time_id"]].drop_duplicates()
    observacoes = pd.concat([
        rounds[["match_id", "round", "vencedor_id", "time_atacante_id"]]
        .rename(columns={"time_atacante_id": "time_id"}).assign(lado="Ataque"),
        rounds[["match_id", "round", "vencedor_id", "time_defensor_id"]]
        .rename(columns={"time_defensor_id": "time_id"}).assign(lado="Defesa"),
    ], ignore_index=True)
    observacoes = observacoes.merge(equipes_elegiveis, on=["match_id", "time_id"], how="inner")
    observacoes["venceu"] = observacoes["time_id"].eq(observacoes["vencedor_id"])
    chaves_round = observacoes[["match_id", "round"]].drop_duplicates()

    abates_validos = base.abates[base.abates["valido"] & base.abates["tempo_round_s"].notna()]
    todos_abates = abates_validos.merge(chaves_round, on=["match_id", "round"], how="inner")
    primeiro_tempo = (
        todos_abates.groupby(["match_id", "round"])["tempo_round_s"].min()
        .rename("primeiro_tempo_s").reset_index()
    )

    habilidades = abates_validos[abates_validos["categoria_meio"].eq("Ability")].copy()
    habilidades = filtros.aplicar(
        habilidades.assign(agente=habilidades["agente_killer"], funcao=habilidades["funcao_killer"]),
        col_time="killer_time_id",
    ).merge(chaves_round, on=["match_id", "round"], how="inner")
    habilidades = habilidades.merge(primeiro_tempo, on=["match_id", "round"], how="left")
    habilidades["abriu_com_habilidade"] = habilidades["tempo_round_s"].eq(habilidades["primeiro_tempo_s"])
    por_equipe = (
        habilidades.groupby(["match_id", "round", "killer_time_id"])
        .agg(abates_habilidade=("killer_time_id", "size"),
             abriu_com_habilidade=("abriu_com_habilidade", "any"))
        .reset_index()
        .rename(columns={"killer_time_id": "time_id"})
    )
    observacoes = observacoes.merge(por_equipe, on=["match_id", "round", "time_id"], how="left")
    observacoes["abates_habilidade"] = observacoes["abates_habilidade"].fillna(0).astype(int)
    observacoes["abriu_com_habilidade"] = observacoes["abriu_com_habilidade"].fillna(False)
    observacoes["situacao_habilidade"] = CATEGORIAS["nenhum"]
    observacoes.loc[
        observacoes["abates_habilidade"].gt(0), "situacao_habilidade"
    ] = CATEGORIAS["outro"]
    observacoes.loc[
        observacoes["abriu_com_habilidade"], "situacao_habilidade"
    ] = CATEGORIAS["primeiro"]

    resultado = (
        observacoes.groupby(["situacao_habilidade", "lado"], sort=False)
        .agg(team_rounds=("venceu", "size"), vitorias=("venceu", "sum"),
             abates_habilidade=("abates_habilidade", "sum"), win_pct=("venceu", "mean"))
        .reset_index()
    )
    resultado["win_pct"] *= 100
    sem_abate = observacoes.loc[observacoes["abates_habilidade"].eq(0), "venceu"].mean()
    com_abate = observacoes.loc[observacoes["abates_habilidade"].gt(0), "venceu"].mean()
    if pd.notna(com_abate) and pd.notna(sem_abate):
        insight = (
            "Cada barra mostra a porcentagem de rounds vencidos por aquele lado e situação; a linha tracejada "
            "marca 50%. Passe o cursor para ver número de rounds, vitórias e abates por habilidade. "
            "Considera o golpe final do abate, não o momento de uso da habilidade; a comparação não demonstra causalidade."
        )
    else:
        insight = "O recorte não tem observações suficientes com e sem abate por habilidade para comparar."
    return {"dados": resultado, "insight": insight}
