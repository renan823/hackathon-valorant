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
    raise HTTPException(501, "Não implementado (T1.9)")


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
