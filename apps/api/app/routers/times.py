"""Ranking e perfil de times (spec §8.3)."""

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query

from app import dados
from app.filtros import Filtros
from app.routers.jogadores import linhas_ranking
from app.routers.partidas import listar_partidas

router = APIRouter(prefix="/times", tags=["times"])

ORDEM_COMPRA = ["Pistol", "Eco", "Semi-eco", "Semi-buy", "Full buy"]
COLUNAS_RANKING = ["posicao", "time_id", "nome", "partidas", "vitorias", "derrotas", "win_pct", "rounds_ganhos",
                   "rounds_perdidos", "saldo_rounds", "atk_win_pct", "def_win_pct", "pistol_win_pct"]


def partidas_por_time(partidas):
    """Uma linha por (partida, time), vista do lado do time: adversário, placar e resultado."""
    colunas = ["match_id", "torneio", "fase", "data", "mapa", "vencedor_id"]
    lados = []
    for eu, ele in (("a", "b"), ("b", "a")):
        lados.append(partidas[colunas].assign(
            time_id=partidas[f"time_{eu}_id"], nome=partidas[f"time_{eu}"],
            adversario_id=partidas[f"time_{ele}_id"], adversario=partidas[f"time_{ele}"],
            rounds_ganhos=partidas[f"placar_{eu}"], rounds_perdidos=partidas[f"placar_{ele}"]))
    longo = pd.concat(lados, ignore_index=True)
    longo["venceu"] = longo["time_id"] == longo["vencedor_id"]
    return longo


def rounds_por_time(rounds):
    """Uma linha por (round, time): lado jogado, compra do time e se venceu o round."""
    colunas = ["match_id", "torneio", "fase", "mapa", "round", "pistol", "vencedor_id"]
    longo = pd.concat([
        rounds[colunas].assign(time_id=rounds["time_atacante_id"], lado="Attacker", compra=rounds["compra_atk"]),
        rounds[colunas].assign(time_id=rounds["time_defensor_id"], lado="Defender", compra=rounds["compra_def"]),
    ], ignore_index=True)
    longo["venceu"] = longo["time_id"] == longo["vencedor_id"]
    return longo


def _pct_rounds(rl, chaves, mascara, nome):
    return (100 * rl[mascara].groupby(chaves)["venceu"].mean()).rename(nome)


def linhas_times(filtros, chaves=("time_id",), min_partidas=0):
    """Ranking de times nas partidas filtradas: ordenado por win% e depois por saldo de rounds."""
    b = dados.base()
    chaves = list(chaves)
    pl = filtros.aplicar(partidas_por_time(b.partidas))
    rl = filtros.aplicar(rounds_por_time(b.rounds))
    df = pl.groupby(chaves).agg(
        nome=("nome", "first"), partidas=("match_id", "size"), vitorias=("venceu", "sum"),
        rounds_ganhos=("rounds_ganhos", "sum"), rounds_perdidos=("rounds_perdidos", "sum"))
    df["derrotas"] = df["partidas"] - df["vitorias"]
    df["win_pct"] = 100 * df["vitorias"] / df["partidas"]
    df["saldo_rounds"] = df["rounds_ganhos"] - df["rounds_perdidos"]
    df = df.join([
        _pct_rounds(rl, chaves, rl["lado"] == "Attacker", "atk_win_pct"),
        _pct_rounds(rl, chaves, rl["lado"] == "Defender", "def_win_pct"),
        _pct_rounds(rl, chaves, rl["pistol"], "pistol_win_pct"),
    ])
    df = df[df["partidas"] >= min_partidas].reset_index()
    df = df.sort_values(["win_pct", "saldo_rounds"], ascending=False, kind="stable").reset_index(drop=True)
    df.insert(0, "posicao", range(1, len(df) + 1))
    return df


def _time(time_id):
    t = dados.base().times
    t = t[t["time_id"] == time_id]
    if t.empty:
        raise HTTPException(404, "Time não encontrado")
    return t.iloc[0]


@router.get("")
def ranking_times(
    filtros: Filtros = Depends(),
    min_partidas: int = Query(0, ge=0, description="Amostra mínima (a EDA usa 8)"),
    limite: int | None = Query(None, ge=1),
):
    df = linhas_times(filtros, min_partidas=min_partidas)[COLUNAS_RANKING]
    return dados.para_json(df.head(limite) if limite else df)


@router.get("/{time_id}")
def perfil(time_id: str):
    b = dados.base()
    t = _time(time_id)
    so_time = Filtros(time=[time_id])
    resumo = linhas_times(so_time).iloc[0].drop(["posicao"]).to_dict()

    j = b.jogadores[b.jogadores["time_id"] == time_id]
    pl = so_time.aplicar(partidas_por_time(b.partidas))
    rl = so_time.aplicar(rounds_por_time(b.rounds))

    por_mapa = linhas_times(so_time, chaves=("time_id", "mapa"))
    por_mapa = por_mapa.sort_values("partidas", ascending=False)[
        ["mapa", "partidas", "vitorias", "win_pct", "saldo_rounds", "atk_win_pct", "def_win_pct"]]

    comp = (j.groupby(["match_id", "mapa", "venceu"])["agente"].agg(lambda s: tuple(sorted(s))).rename("agentes")
            .reset_index().groupby(["mapa", "agentes"])
            .agg(partidas=("match_id", "size"), vitorias=("venceu", "sum")).reset_index())
    comp["win_pct"] = 100 * comp["vitorias"] / comp["partidas"]
    comp["agentes"] = comp["agentes"].map(list)

    confrontos = (pl.groupby(["adversario_id", "adversario"])
                  .agg(partidas=("match_id", "size"), vitorias=("venceu", "sum")).reset_index()
                  .sort_values(["partidas", "vitorias"], ascending=False))

    economia = rl.groupby("compra").agg(rounds=("venceu", "size"), win_pct=("venceu", "mean"))
    economia["win_pct"] *= 100
    economia = economia.reindex([c for c in ORDEM_COMPRA if c in economia.index]).reset_index()

    return dados.para_json({
        "time_id": time_id, "nome": t["nome"], "torneios": t["torneios"], "resumo": resumo,
        "elenco": linhas_ranking(j).drop(columns=["time_id", "time"]),
        "por_mapa": por_mapa,
        "composicoes": comp.sort_values(["partidas", "win_pct"], ascending=False),
        "confrontos": confrontos, "economia": economia,
    })


@router.get("/{time_id}/partidas")
def partidas_do_time(time_id: str, filtros: Filtros = Depends()):
    _time(time_id)
    filtros.time = [time_id]
    p = filtros.aplicar(dados.base().partidas, col_time=("time_a_id", "time_b_id"))
    return dados.para_json(listar_partidas(p))
