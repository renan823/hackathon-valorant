"""Rotas gerais: saúde, opções de filtro, Home, busca e heatmap (spec §8.1 e §8.6)."""

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query

from app import dados
from app.filtros import Filtros

router = APIRouter(tags=["geral"])


@router.get("/saude")
def saude():
    base = dados.BASE
    return {
        "status": "ok" if base is not None else "sem_dados",
        "partidas": len(base.partidas) if base is not None else None,
        "carregado_em": base.carregado_em.isoformat() if base is not None else None,
    }


@router.get("/filtros")
def opcoes_de_filtro():
    b = dados.base()
    agentes = b.jogadores.drop_duplicates("agente").sort_values("agente")
    return dados.para_json({
        "torneios": [{"nome": t, "fases": sorted(g["fase"].unique())} for t, g in b.partidas.groupby("torneio")],
        "mapas": sorted(b.partidas["mapa"].unique()),  # só os mapas jogados (R8)
        "times": [{"id": t.time_id, "nome": t.nome} for t in b.times.itertuples()],
        "agentes": [{"nome": a.agente, "funcao": a.funcao} for a in agentes.itertuples()],
        "funcoes": sorted(b.jogadores["funcao"].unique()),
    })


@router.get("/resumo")
def resumo():
    raise HTTPException(501, "Não implementado (T2.15)")


@router.get("/busca")
def busca(q: str = Query(..., min_length=2, description="Trecho do nick ou do nome do time")):
    raise HTTPException(501, "Não implementado (T2.13)")


@router.get("/heatmap")
def heatmap(
    mapa: str = Query(..., description="Obrigatório: coordenadas só são comparáveis no mesmo mapa"),
    tipo: Literal["kills", "mortes", "plants"] = "kills",
    jogador: str | None = Query(None, description="puuid de quem faz a ação do tipo"),
    lado: Literal["Attacker", "Defender"] | None = None,
    filtros: Filtros = Depends(),
):
    raise HTTPException(501, "Não implementado (T2.14)")
