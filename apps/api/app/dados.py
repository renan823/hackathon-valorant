"""Carga, limpeza e enriquecimento das tabelas em memória (spec §5, plano §3.1).

`carregar()` roda uma vez no startup e preenche o global `BASE`. Os routers acessam sempre
`dados.base()` (e não `from app.dados import BASE`), porque o objeto é criado depois do import.
"""

import json
import math
import sys
from dataclasses import dataclass
from datetime import date, datetime
from functools import lru_cache
from pathlib import Path

import numpy as np
import pandas as pd

from app import mapas
from app.metricas import SOMAS

# Raiz do repositório (este arquivo fica em apps/api/app/).
RAIZ = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(RAIZ / "packages" / "valorant-data"))
import valorant_data as vd  # noqa: E402

# Colunas constantes ou sem uso analítico (mesmo critério do notebook de preparação).
COLUNAS_DESCARTADAS = ["regiao", "modo", "is_ranked", "provisioning_flow", "custom_game_name", "queue_id",
                       "competitive_tier", "party_id", "is_observer"]


@dataclass
class Base:
    partidas: pd.DataFrame   # 1 linha por partida
    jogadores: pd.DataFrame  # jogador × partida (sem observadores)
    rounds: pd.DataFrame
    economia: pd.DataFrame
    abates: pd.DataFrame     # todos os registros, com coluna `valido` (R1)
    dano_round: pd.DataFrame  # dano a inimigos por jogador por round
    times: pd.DataFrame
    carregado_em: datetime


BASE: Base | None = None


def carregar():
    """Lê data/ com packages/valorant-data/valorant_data.py, aplica `preparar()` e preenche BASE."""
    global BASE
    BASE = preparar(vd.carregar_tabelas(), vd.carregar_referencia())
    partida_bruta.cache_clear()


def base():
    if BASE is None:
        raise RuntimeError("Dados não carregados: dados.carregar() roda no startup da API.")
    return BASE


def slug(nome):
    """Inverso de valorant_data._formatar_time: 'Azure Bears Golden' -> 'azure_bears_golden'."""
    return nome.lower().replace(" ", "_") if isinstance(nome, str) else None


# --- Preparação ------------------------------------------------------------------------

def preparar(tabelas, ref):
    """Aplica as regras R1–R10 da spec e monta as tabelas do contrato (plano §3.1)."""
    jogadores = _preparar_jogadores(tabelas["jogadores"])
    partidas = _preparar_partidas(tabelas["jogadores"])
    rounds = _preparar_rounds(tabelas["rounds"], partidas, jogadores)
    return Base(
        partidas=partidas,
        jogadores=jogadores,
        rounds=rounds,
        economia=_preparar_economia(tabelas["economia"], partidas, ref),
        abates=_preparar_abates(tabelas["abates"], partidas, jogadores, rounds, ref),
        dano_round=tabelas["dano_round"],
        times=_preparar_times(jogadores),
        carregado_em=datetime.now(),
    )


def _preparar_jogadores(bruto):
    j = bruto[~bruto["is_observer"].astype(bool)].copy()
    # Viravam float por causa dos NaN dos observadores.
    j[SOMAS + ["rounds_ganhos_time", "rounds_ganhos_adversario"]] = (
        j[SOMAS + ["rounds_ganhos_time", "rounds_ganhos_adversario"]].astype(int))
    j["venceu"] = j["venceu"].astype(bool)
    # O mesmo puuid pode aparecer com até 3 nicks: exibimos o mais recente.
    j = j.rename(columns={"nick": "nick_partida"})
    j["nick"] = j["puuid"].map(j.sort_values("inicio").groupby("puuid")["nick_partida"].last())
    j["time_id"] = j["time"].map(slug)
    j["adversario_id"] = j["adversario"].map(slug)
    return j.drop(columns=COLUNAS_DESCARTADAS).reset_index(drop=True)


def _preparar_partidas(bruto):
    p = bruto.drop_duplicates("match_id")[
        ["match_id", "arquivo", "torneio", "fase", "codigo", "data", "mapa", "n_rounds", "duracao_min"]]
    # Times e placar vêm do nome do arquivo; Red/Blue não indica o lado esquerdo (R2).
    info = p["arquivo"].str.removesuffix(".json").str.extract(vd.PADRAO_ARQUIVO)
    p = p.assign(
        serie_id=info["prefixo"] + "_" + p["codigo"].str.replace(r"[a-z]$", "", regex=True),
        time_a_id=info["time_a"], time_a=info["time_a"].map(vd._formatar_time),
        placar_a=info["placar_a"].astype(int),
        time_b_id=info["time_b"], time_b=info["time_b"].map(vd._formatar_time),
        placar_b=info["placar_b"].astype(int),
    )
    p["vencedor_id"] = p["time_a_id"].where(p["placar_a"] > p["placar_b"], p["time_b_id"])
    return p.sort_values("data", ascending=False).reset_index(drop=True)


def _com_partida(df, partidas):
    """Garante as colunas de partida usadas pelos filtros em qualquer tabela."""
    faltando = [c for c in ("torneio", "fase", "data", "mapa") if c not in df.columns]
    return df.join(partidas.set_index("match_id")[faltando], on="match_id") if faltando else df


def _normalizar(df, cx, cy):
    """Substitui as coordenadas cruas de `cx`/`cy` pelas normalizadas em [0, 1], mapa a mapa."""
    nx = pd.Series(np.nan, index=df.index)
    ny = pd.Series(np.nan, index=df.index)
    for mapa, idx in df.groupby("mapa").groups.items():
        nx.loc[idx], ny.loc[idx] = mapas.normalizar(mapa, df.loc[idx, cx], df.loc[idx, cy])
    df[cx], df[cy] = nx, ny


def _info_jogador(jogadores, sufixo):
    """(match_id, puuid) → time_id, agente e função, com nomes de coluna para killer/vítima/planter."""
    return jogadores.set_index(["match_id", "puuid"])[["time_id", "agente", "funcao"]].rename(columns={
        "time_id": f"{sufixo}_time_id", "agente": f"agente_{sufixo}", "funcao": f"funcao_{sufixo}"})


def _preparar_rounds(bruto, partidas, jogadores):
    r = _com_partida(bruto.copy(), partidas)
    for col in ("time_atacante", "time_defensor", "vencedor"):
        r[f"{col}_id"] = r[col].map(slug)
    # A API grava "" e 0 quando não houve plant/defuse: valores ausentes disfarçados.
    r["plant_site"] = r["plant_site"].replace("", None)
    r["houve_plant"] = r["plant_site"].notna()
    r["houve_defuse"] = r["defuse_tempo_s"] > 0
    r["plant_tempo_s"] = r["plant_tempo_s"].where(r["houve_plant"])
    r["defuse_tempo_s"] = r["defuse_tempo_s"].where(r["houve_defuse"])
    r = r.join(_info_jogador(jogadores, "planter").drop(columns="planter_time_id"), on=["match_id", "planter"])
    _normalizar(r, "plant_x", "plant_y")
    return r


def _preparar_abates(bruto, partidas, jogadores, rounds, ref):
    a = _com_partida(bruto.copy(), partidas)
    a = a.join(_info_jogador(jogadores, "killer"), on=["match_id", "killer"])
    a = a.join(_info_jogador(jogadores, "vitima"), on=["match_id", "vitima"])
    atacante = rounds.drop_duplicates(["match_id", "round"]).set_index(["match_id", "round"])["time_atacante_id"]
    a["lado_vitima"] = np.where(a.join(atacante, on=["match_id", "round"])["time_atacante_id"] == a["vitima_time_id"],
                                "Attacker", "Defender")

    # Meio do abate: nome da arma (ou da habilidade registrada como "Weapon", R3) ou o tipo de dano.
    item = a["item_dano"].str.lower()
    arma = a["tipo_dano"] == "Weapon"
    a["meio"] = np.where(arma, item.map(lambda u: ref["weapons"].get(u, {}).get("arma")), a["tipo_dano"])
    a["categoria_meio"] = np.where(arma, item.map(lambda u: ref["weapons"].get(u, {}).get("categoria")),
                                   a["tipo_dano"])
    a.loc[arma & a["item_dano"].eq(""), ["meio", "categoria_meio"]] = ["Chamber (habilidade)", "Ability"]  # R4

    # Para habilidades genéricas, diferenciar pelo slot usando item_dano antes de descartá-lo.
    _SLOTS = {"ultimate": "Ultimate", "ability1": "Habilidade Q",
              "ability2": "Habilidade E", "grenade": "Habilidade C"}
    hab = ~arma & (a["tipo_dano"] == "Ability")
    a.loc[hab, "meio"] = item[hab].map(lambda i: _SLOTS.get(i, "Habilidade"))
    a.loc[hab, "categoria_meio"] = "Ability"

    _normalizar(a, "killer_x", "killer_y")
    _normalizar(a, "vitima_x", "vitima_y")
    return a.drop(columns=["time_killer", "item_dano"])


def _preparar_economia(bruto, partidas, ref):
    e = _com_partida(bruto.copy(), partidas)
    e["time_id"] = e["time"].map(slug)
    e["arma"] = vd.nomear_itens(e["arma_uuid"], ref, "weapons")
    e["armadura"] = vd.nomear_itens(e["armadura_uuid"], ref, "gear").fillna("Sem armadura")
    return e.drop(columns=["arma_uuid", "armadura_uuid"])


def _preparar_times(jogadores):
    return (jogadores.groupby("time_id")
            .agg(nome=("time", "first"), torneios=("torneio", lambda s: sorted(s.unique())))
            .reset_index().sort_values("nome", ignore_index=True))


# --- Saída -----------------------------------------------------------------------------

def para_json(obj, casas=2):
    """Converte DataFrame, Series, dict, list e escalares numpy/pandas em tipos JSON.

    Floats são arredondados para `casas` (coordenadas de mapa usam 4); NaN/NaT viram None.
    """
    if isinstance(obj, pd.DataFrame):
        return [para_json(linha, casas) for linha in obj.to_dict("records")]
    if isinstance(obj, pd.Series):
        return para_json(obj.to_dict(), casas)
    if isinstance(obj, dict):
        return {str(k): para_json(v, casas) for k, v in obj.items()}
    if isinstance(obj, (list, tuple, set, np.ndarray)):
        return [para_json(v, casas) for v in obj]
    if obj is None or obj is pd.NA or obj is pd.NaT:
        return None
    if isinstance(obj, (bool, np.bool_)):
        return bool(obj)
    if isinstance(obj, (int, np.integer)):
        return int(obj)
    if isinstance(obj, (float, np.floating)):
        return None if math.isnan(obj) or math.isinf(obj) else round(float(obj), casas)
    if isinstance(obj, (pd.Timestamp, datetime, date)):
        return obj.strftime("%Y-%m-%d")
    return obj


@lru_cache(maxsize=32)
def partida_bruta(match_id):
    """JSON original da partida, para features que precisem de dados não tabelados."""
    linha = base().partidas.loc[lambda p: p["match_id"] == match_id]
    if linha.empty:
        raise KeyError(match_id)
    arquivo = linha["arquivo"].iloc[0]
    caminho = next(c for c in vd.listar_arquivos() if c.name == arquivo)
    with open(caminho, encoding="utf-8") as f:
        return json.load(f)
