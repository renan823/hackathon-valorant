"""Normalização das coordenadas do jogo para [0, 1] sobre o minimapa (spec §7).

Usa a calibração oficial da valorant-api (reference/map_calibration.json), que troca os eixos:
    x' = y · xMultiplier + xScalarToAdd    (horizontal)
    y' = x · yMultiplier + yScalarToAdd    (vertical)
"""


def normalizar(mapa, x, y):
    """Devolve (x', y') como Series; pontos fora de [0, 1] ou nulos viram None (R6) (T1.4)."""
    raise NotImplementedError("T1.4")
