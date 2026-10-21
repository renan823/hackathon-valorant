"""Carga, limpeza e enriquecimento das tabelas em memória (spec §5, plano §3.1).

`carregar()` roda uma vez no startup e preenche o global `BASE`. Os routers acessam sempre
`dados.BASE` (e não `from app.dados import BASE`), porque o objeto é criado depois do import.
"""

import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

import pandas as pd

# Raiz do repositório (este arquivo fica em backend/app/).
RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "src"))


@dataclass
class Base:
    partidas: pd.DataFrame   # 1 linha por partida
    jogadores: pd.DataFrame  # jogador × partida (sem observadores)
    rounds: pd.DataFrame
    economia: pd.DataFrame
    abates: pd.DataFrame     # todos os registros, com coluna `valido` (R1)
    times: pd.DataFrame
    carregado_em: datetime


BASE: Base | None = None


def carregar():
    """Lê data/ com src/valorant_data.py, aplica `preparar()` e preenche BASE (T1.5a/T1.5b)."""
    # Até a T1.5a, a API sobe sem dados: só /api/saude responde.


def preparar(tabelas):
    """Aplica as regras R1–R10 da spec e monta partidas, times e as colunas do contrato (T1.5a/T1.5b)."""
    raise NotImplementedError("T1.5a/T1.5b")


def para_json(obj):
    """Converte DataFrame, Series, dict, list e escalares numpy/pandas em tipos JSON (T1.6)."""
    raise NotImplementedError("T1.6")


def partida_bruta(match_id):
    """JSON original da partida, com cache, para features que precisem de dados não tabelados (T1.6)."""
    raise NotImplementedError("T1.6")
