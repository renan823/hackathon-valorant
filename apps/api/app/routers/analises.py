"""Lista e executa as análises registradas em app/analises/ (spec §8.5)."""

from fastapi import APIRouter, Depends, HTTPException

from app import dados
from app.analises import REGISTRO, metadados
from app.filtros import Filtros

router = APIRouter(prefix="/analises", tags=["analises"])


@router.get("")
def lista():
    return [metadados(a) for a in REGISTRO.values()]


@router.get("/{analise_id}")
def executar(analise_id: str, filtros: Filtros = Depends()):
    if analise_id not in REGISTRO:
        raise HTTPException(404, "Análise não encontrada")
    registro = REGISTRO[analise_id]
    resultado = registro["funcao"](dados.base(), filtros)
    return dados.para_json({**metadados(registro), "dados": resultado["dados"],
                            "insight": resultado.get("insight"), "kpi": resultado.get("kpi")})
