"""Filtros comuns aceitos pelos endpoints de lista e de análise (spec §7.1).

Uso nos routers: `filtros: Filtros = Depends()`. Cada parâmetro aceita múltiplos valores
(`?mapa=Ascent&mapa=Haven`). `min_rounds`, `ordenar`, `ordem` e `limite` não são filtros: ficam
só nos endpoints de ranking.
"""

from typing import Annotated

import pandas as pd
from fastapi import Query

Valores = list[str] | None

# Filtros aplicados direto pela coluna de mesmo nome; `time` tem coluna configurável.
COLUNAS = ("torneio", "fase", "mapa", "agente", "funcao")


class Filtros:
    def __init__(
        self,
        torneio: Annotated[Valores, Query(description="Ex.: Univavá")] = None,
        fase: Annotated[Valores, Query(description="Ex.: Fase de Grupos")] = None,
        mapa: Annotated[Valores, Query(description="Ex.: Ascent")] = None,
        time: Annotated[Valores, Query(description="time_id, ex.: azure_bears_golden")] = None,
        agente: Annotated[Valores, Query(description="Ex.: Omen")] = None,
        funcao: Annotated[Valores, Query(description="Controlador, Duelista, Iniciador ou Sentinela")] = None,
    ):
        self.torneio = torneio
        self.fase = fase
        self.mapa = mapa
        self.time = time
        self.agente = agente
        self.funcao = funcao

    def aplicar(self, df, col_time="time_id"):
        """Filtra `df` só pelas colunas que ele tem; `col_time` em tupla aplica OU entre as colunas."""
        mascara = pd.Series(True, index=df.index)
        for coluna in COLUNAS:
            valores = getattr(self, coluna)
            if valores and coluna in df.columns:
                mascara &= df[coluna].isin(valores)
        if self.time:
            colunas = [c for c in ((col_time,) if isinstance(col_time, str) else col_time) if c in df.columns]
            if colunas:
                mascara &= pd.concat([df[c].isin(self.time) for c in colunas], axis=1).any(axis=1)
        return df[mascara]
