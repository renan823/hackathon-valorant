"""Lista e executa as análises registradas em app/analises/ (spec §8.5)."""

from fastapi import APIRouter, Depends, HTTPException

from app.filtros import Filtros

router = APIRouter(prefix="/analises", tags=["analises"])


@router.get("")
def lista():
    raise HTTPException(501, "Não implementado (T3.1)")


@router.get("/{analise_id}")
def executar(analise_id: str, filtros: Filtros = Depends()):
    raise HTTPException(501, "Não implementado (T3.1)")
