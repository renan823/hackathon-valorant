"""Ranking, distribuição e perfil de jogadores (spec §8.2)."""

from typing import Literal

import numpy as np
from fastapi import APIRouter, Depends, HTTPException, Query

from app import dados
from app.filtros import Filtros
from app.metricas import METRICAS, agregar, ranking

router = APIRouter(prefix="/jogadores", tags=["jogadores"])

COLUNAS_RANKING = ["posicao", "puuid", "nick", "time_id", "time", "partidas", "vitorias", "win_pct", "rounds",
                   "kills", "deaths", "assists", "mais_menos", "acs", "adr", "kd", "kast_pct", "hs_pct",
                   "kpr", "apr", "fk_round", "fd_round", "multikills", "agente_principal", "funcao_principal"]
# Decisão D4 (plano do backend, §7): com 50 rounds o 1º lugar tinha só 3 partidas; com 100 o topo estabiliza.
MIN_ROUNDS_PADRAO = 100


def mais_frequente(df, chave, coluna):
    """Valor mais frequente de `coluna` para cada `chave` (empate: o que aparece primeiro)."""
    contagem = df.groupby([chave, coluna], sort=False).size().rename("n").reset_index()
    return contagem.sort_values("n", ascending=False, kind="stable").drop_duplicates(chave).set_index(chave)[coluna]


def linhas_ranking(j, ordenar="acs", ordem="desc", min_rounds=0, limite=None):
    """Uma linha por jogador com as métricas de `agregar` e time/agente principal nas linhas `j`."""
    m = agregar(j, ["puuid"]).set_index("puuid")
    m["nick"] = j.groupby("puuid")["nick"].first()
    m["time_id"] = mais_frequente(j, "puuid", "time_id")
    m["time"] = m["time_id"].map(dados.base().times.set_index("time_id")["nome"])
    m["agente_principal"] = mais_frequente(j, "puuid", "agente")
    m["funcao_principal"] = m["agente_principal"].map(j.drop_duplicates("agente").set_index("agente")["funcao"])
    return ranking(m.reset_index(), ordenar, ordem, min_rounds, limite)[COLUNAS_RANKING]


def _validar_metrica(metrica):
    if metrica not in METRICAS:
        raise HTTPException(422, f"Métrica desconhecida: {metrica}. Opções: {', '.join(METRICAS)}")


def _jogador(puuid):
    j = dados.base().jogadores
    j = j[j["puuid"] == puuid]
    if j.empty:
        raise HTTPException(404, "Jogador não encontrado")
    return j


@router.get("")
def ranking_jogadores(
    filtros: Filtros = Depends(),
    ordenar: str = Query("acs", description="Qualquer métrica de agregar()"),
    ordem: Literal["asc", "desc"] = "desc",
    min_rounds: int = Query(MIN_ROUNDS_PADRAO, ge=0),
    limite: int = Query(100, ge=1),
):
    _validar_metrica(ordenar)
    j = filtros.aplicar(dados.base().jogadores)
    return dados.para_json(linhas_ranking(j, ordenar, ordem, min_rounds, limite))


# Declarada antes de /{puuid} para "distribuicao" não ser lido como puuid.
@router.get("/distribuicao")
def distribuicao(
    filtros: Filtros = Depends(),
    metrica: str = "acs",
    bins: int = Query(20, ge=2, le=100),
    min_rounds: int = Query(MIN_ROUNDS_PADRAO, ge=0),
):
    _validar_metrica(metrica)
    valores = linhas_ranking(filtros.aplicar(dados.base().jogadores), min_rounds=min_rounds)[metrica].dropna()
    if valores.empty:
        return []
    contagem, bordas = np.histogram(valores, bins=bins)
    pct = 100 * contagem / contagem.sum()
    return dados.para_json([
        {"inicio": bordas[i], "fim": bordas[i + 1], "jogadores": contagem[i], "pct": pct[i],
         "pct_acumulado": pct[: i + 1].sum()}
        for i in range(len(contagem))
    ])


@router.get("/{puuid}")
def perfil(puuid: str):
    b = dados.base()
    j = _jogador(puuid)
    resumo = linhas_ranking(j).iloc[0].drop("posicao").to_dict()
    geral = linhas_ranking(b.jogadores, min_rounds=MIN_ROUNDS_PADRAO).set_index("puuid")["posicao"]
    resumo["posicao_ranking"] = geral.get(puuid)  # None abaixo do mínimo de rounds

    recentes = j.sort_values("inicio", ascending=False)
    nicks = [n for n in recentes["nick_partida"].unique() if n != resumo["nick"]]
    times = (j.groupby(["time_id", "time"]).size().rename("partidas").reset_index()
             .rename(columns={"time_id": "id", "time": "nome"}).sort_values("partidas", ascending=False))

    def por(chaves):
        cols = chaves + ["partidas", "vitorias", "win_pct", "rounds", "acs", "adr", "kd", "kast_pct"]
        return agregar(j, chaves).sort_values(["partidas", "acs"], ascending=False)[cols]

    a = b.abates
    kills = a[a["valido"] & (a["killer"] == puuid)]
    armas = kills.groupby(["meio", "categoria_meio"]).size().rename("kills").reset_index()
    armas["pct"] = 100 * armas["kills"] / armas["kills"].sum()

    evolucao = agregar(j, ["match_id"]).merge(j[["match_id", "data", "inicio", "mapa", "venceu"]], on="match_id")
    evolucao = evolucao.sort_values("inicio")[["match_id", "data", "mapa", "venceu", "acs", "adr", "kd", "kast_pct"]]

    return dados.para_json({
        "puuid": puuid, "nick": resumo["nick"], "nicks_anteriores": nicks,
        "times": times, "resumo": resumo,
        "por_agente": por(["agente", "funcao"]), "por_mapa": por(["mapa"]),
        "armas": armas.sort_values("kills", ascending=False), "evolucao": evolucao,
    })


@router.get("/{puuid}/partidas")
def historico(puuid: str):
    j = _jogador(puuid)
    info = j[["match_id", "data", "inicio", "torneio", "fase", "mapa", "time_id", "time", "adversario_id",
              "adversario", "rounds_ganhos_time", "rounds_ganhos_adversario", "venceu", "agente"]]
    m = agregar(j, ["match_id"]).merge(info, on="match_id").sort_values("inicio", ascending=False)
    m = m.rename(columns={"rounds_ganhos_time": "placar_time", "rounds_ganhos_adversario": "placar_adversario"})
    return dados.para_json(m[[
        "match_id", "data", "torneio", "fase", "mapa", "time_id", "time", "adversario_id", "adversario",
        "placar_time", "placar_adversario", "venceu", "agente", "kills", "deaths", "assists", "mais_menos",
        "acs", "adr", "kast_pct", "hs_pct", "first_kills", "multikills"]])
