"""Ranking e perfil de times (spec §8.3)."""

from fastapi import APIRouter, Depends, HTTPException

from app.filtros import Filtros

router = APIRouter(prefix="/times", tags=["times"])


@router.get("")
def ranking_times(filtros: Filtros = Depends()):
    raise HTTPException(501, "Não implementado (T2.10)")


@router.get("/{time_id}")
def perfil(time_id: str):
    raise HTTPException(501, "Não implementado (T2.11)")


@router.get("/{time_id}/partidas")
def partidas_do_time(time_id: str, filtros: Filtros = Depends()):
    raise HTTPException(501, "Não implementado (T2.12)")
