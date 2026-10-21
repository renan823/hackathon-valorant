"""Lista de partidas e detalhes de uma partida: placar, rounds, abates e duelos (spec §8.4)."""

from fastapi import APIRouter, Depends, HTTPException

from app.filtros import Filtros

router = APIRouter(prefix="/partidas", tags=["partidas"])


@router.get("")
def lista(filtros: Filtros = Depends()):
    raise HTTPException(501, "Não implementado (T2.5)")


@router.get("/{match_id}")
def placar(match_id: str):
    raise HTTPException(501, "Não implementado (T2.6)")


@router.get("/{match_id}/rounds")
def rounds(match_id: str):
    raise HTTPException(501, "Não implementado (T2.7)")


@router.get("/{match_id}/abates")
def abates(match_id: str):
    raise HTTPException(501, "Não implementado (T2.8)")


@router.get("/{match_id}/duelos")
def duelos(match_id: str):
    raise HTTPException(501, "Não implementado (T2.9)")
