"""Registro das análises plugáveis (spec §8.5).

Cada arquivo desta pasta define uma análise com o decorator `@analise`. O autoimport (T3.1) faz
qualquer arquivo novo aparecer em /api/analises sem mexer em outro lugar.
"""

# id → metadados da análise + "funcao": f(base, filtros) -> {"dados": ..., "insight": ...}
REGISTRO = {}


def analise(id, titulo, categoria, grafico, descricao=""):
    """Registra a função decorada em REGISTRO (T3.1)."""
    raise NotImplementedError("T3.1")
