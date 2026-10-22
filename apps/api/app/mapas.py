"""Normalização das coordenadas do jogo para [0, 1] sobre o minimapa (spec §7).

Usa a calibração oficial da valorant-api (reference/map_calibration.json), que troca os eixos:
    x' = y · xMultiplier + xScalarToAdd    (horizontal)
    y' = x · yMultiplier + yScalarToAdd    (vertical)
"""

import json
from functools import cache
from pathlib import Path

import pandas as pd

ARQUIVO_CALIBRACAO = Path(__file__).resolve().parents[3] / "reference" / "map_calibration.json"


@cache
def calibracao():
    with open(ARQUIVO_CALIBRACAO, encoding="utf-8") as f:
        return json.load(f)


def normalizar(mapa, x, y):
    """Devolve (x', y') como Series; pontos fora de [0, 1] ou nulos viram NaN, null no JSON (R6)."""
    cal = calibracao().get(str(mapa).lower())
    x = pd.to_numeric(pd.Series(x), errors="coerce")
    y = pd.to_numeric(pd.Series(y), errors="coerce")
    if cal is None:
        vazio = pd.Series(None, index=x.index, dtype="float64")
        return vazio, vazio.copy()
    nx = y * cal["xMultiplier"] + cal["xScalarToAdd"]
    ny = x * cal["yMultiplier"] + cal["yScalarToAdd"]
    dentro = nx.between(0, 1) & ny.between(0, 1)
    return nx.where(dentro), ny.where(dentro)
