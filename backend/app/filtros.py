"""Filtros comuns aceitos pelos endpoints de lista e de análise (spec §7.1).

Uso nos routers: `filtros: Filtros = Depends()`. Cada parâmetro aceita múltiplos valores
(`?mapa=Ascent&mapa=Haven`). `min_rounds`, `ordenar`, `ordem` e `limite` não são filtros: ficam
só nos endpoints de ranking.
"""

from fastapi import Query


class Filtros:
    def __init__(
        self,
        torneio: list[str] | None = Query(None, description="Ex.: Univavá"),
        fase: list[str] | None = Query(None, description="Ex.: Fase de Grupos"),
        mapa: list[str] | None = Query(None, description="Ex.: Ascent"),
        time: list[str] | None = Query(None, description="time_id, ex.: azure_bears_golden"),
        agente: list[str] | None = Query(None, description="Ex.: Omen"),
        funcao: list[str] | None = Query(None, description="Controlador, Duelista, Iniciador ou Sentinela"),
    ):
        self.torneio = torneio
        self.fase = fase
        self.mapa = mapa
        self.time = time
        self.agente = agente
        self.funcao = funcao

    def aplicar(self, df, col_time="time_id"):
        """Filtra `df` só pelas colunas que ele tem; `col_time` em tupla aplica OU (T1.7)."""
        raise NotImplementedError("T1.7")
