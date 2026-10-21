"""Ranking, distribuição e perfil de jogadores (spec §8.2)."""

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query

from app.filtros import Filtros

router = APIRouter(prefix="/jogadores", tags=["jogadores"])


@router.get("")
def ranking_jogadores(
    filtros: Filtros = Depends(),
    ordenar: str = Query("acs", description="Qualquer métrica de agregar()"),
    ordem: Literal["asc", "desc"] = "desc",
    min_rounds: int = Query(50, ge=0),
    limite: int = Query(100, ge=1),
):
    raise HTTPException(501, "Não implementado (T2.1)")


# Declarada antes de /{puuid} para "distribuicao" não ser lido como puuid.
@router.get("/distribuicao")
def distribuicao(
    filtros: Filtros = Depends(),
    metrica: str = "acs",
    bins: int = Query(20, ge=2, le=100),
    min_rounds: int = Query(50, ge=0),
):
    raise HTTPException(501, "Não implementado (T2.2)")


@router.get("/{puuid}")
def perfil(puuid: str):
    raise HTTPException(501, "Não implementado (T2.3)")


@router.get("/{puuid}/partidas")
def historico(puuid: str):
    raise HTTPException(501, "Não implementado (T2.4)")
