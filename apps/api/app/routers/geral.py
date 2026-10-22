"""Rotas gerais: saúde, opções de filtro, Home, busca e heatmap (spec §8.1 e §8.6)."""

import unicodedata
from typing import Literal

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query

from app import dados
from app.analises import REGISTRO
from app.filtros import Filtros
from app.routers.jogadores import MIN_ROUNDS_PADRAO, linhas_ranking
from app.routers.partidas import listar_partidas
from app.routers.times import COLUNAS_RANKING as COLUNAS_TIMES, linhas_times

router = APIRouter(tags=["geral"])

# Análises cujo campo "kpi" aparece na Home, na ordem dos cards.
KPIS_HOME = ["lado-por-mapa", "pistol", "first-kill", "meta-armas"]
# Na Home, só times com amostra mínima (mesmo corte da EDA).
MIN_PARTIDAS_HOME = 8


@router.get("/saude")
def saude():
    base = dados.BASE
    return {
        "status": "ok" if base is not None else "sem_dados",
        "partidas": len(base.partidas) if base is not None else None,
        "carregado_em": base.carregado_em.isoformat() if base is not None else None,
    }


@router.get("/filtros")
def opcoes_de_filtro():
    b = dados.base()
    agentes = b.jogadores.drop_duplicates("agente").sort_values("agente")
    return dados.para_json({
        "torneios": [{"nome": t, "fases": sorted(g["fase"].unique())} for t, g in b.partidas.groupby("torneio")],
        "mapas": sorted(b.partidas["mapa"].unique()),  # só os mapas jogados (R8)
        "times": [{"id": t.time_id, "nome": t.nome} for t in b.times.itertuples()],
        "agentes": [{"nome": a.agente, "funcao": a.funcao} for a in agentes.itertuples()],
        "funcoes": sorted(b.jogadores["funcao"].unique()),
    })


@router.get("/resumo")
def resumo():
    b = dados.base()
    kpis = []
    for analise_id in KPIS_HOME:
        # As análises entram na Fase 3; até lá a Home simplesmente não mostra os KPIs.
        if analise_id in REGISTRO:
            resultado = REGISTRO[analise_id]["funcao"](b, Filtros())
            if resultado.get("kpi"):
                kpis.append({"analise_id": analise_id, **resultado["kpi"]})
    return dados.para_json({
        "contadores": {
            "partidas": len(b.partidas), "jogadores": b.jogadores["puuid"].nunique(), "times": len(b.times),
            "rounds": len(b.rounds), "abates": int(b.abates["valido"].sum()),
        },
        "kpis": kpis,
        "ultimas_partidas": listar_partidas(b.partidas.head(8)),
        "top_jogadores": linhas_ranking(b.jogadores, min_rounds=MIN_ROUNDS_PADRAO, limite=5),
        "top_times": linhas_times(Filtros(), min_partidas=MIN_PARTIDAS_HOME).head(5)[COLUNAS_TIMES],
    })


def _sem_acento(texto):
    return "".join(c for c in unicodedata.normalize("NFKD", str(texto)) if not unicodedata.combining(c)).lower()


@router.get("/busca")
def busca(q: str = Query(..., min_length=2, description="Trecho do nick ou do nome do time")):
    b = dados.base()
    termo = _sem_acento(q)
    times = b.times[b.times["nome"].map(_sem_acento).str.contains(termo, regex=False)
                    | b.times["time_id"].str.contains(termo, regex=False)]
    partidas_time = pd.concat([b.partidas["time_a_id"], b.partidas["time_b_id"]]).value_counts()
    j = b.jogadores
    # Busca também nos nicks antigos, mas exibe o nick atual.
    achados = j[j["nick_partida"].map(_sem_acento).str.contains(termo, regex=False)]["puuid"].unique()
    jogadores = (linhas_ranking(j[j["puuid"].isin(achados)], ordenar="partidas") if len(achados)
                 else pd.DataFrame(columns=["puuid", "nick", "time"]))

    resultados = [
        {"tipo": "time", "id": t.time_id, "nome": t.nome, "detalhe": f"{partidas_time.get(t.time_id, 0)} partidas"}
        for t in times.assign(n=times["time_id"].map(partidas_time)).sort_values("n", ascending=False).itertuples()
    ] + [
        {"tipo": "jogador", "id": x.puuid, "nome": x.nick, "detalhe": x.time}
        for x in jogadores.itertuples()
    ]
    return dados.para_json(resultados[:10])


def _visao_heatmap(b, tipo):
    """Colunas genéricas (puuid, time_id, agente, funcao, lado, x, y) de quem faz a ação do `tipo`."""
    base = ["match_id", "torneio", "fase", "data", "mapa"]
    if tipo == "plants":
        r = b.rounds[b.rounds["houve_plant"]]
        return r[base].assign(puuid=r["planter"], time_id=r["time_atacante_id"], agente=r["agente_planter"],
                              funcao=r["funcao_planter"], lado="Attacker", x=r["plant_x"], y=r["plant_y"])
    a = b.abates
    if tipo == "kills":
        a = a[a["valido"]]  # spike/queda/teamkill não são kills (R1)
        quem, pos = "killer", "killer"
    else:
        quem, pos = "vitima", "vitima"
    return a[base].assign(puuid=a[quem], time_id=a[f"{quem}_time_id"], agente=a[f"agente_{quem}"],
                          funcao=a[f"funcao_{quem}"], lado=a[f"lado_{quem}"], x=a[f"{pos}_x"], y=a[f"{pos}_y"])


@router.get("/heatmap")
def heatmap(
    tipo: Literal["kills", "mortes", "plants"] = "kills",
    jogador: str | None = Query(None, description="puuid de quem faz a ação do tipo"),
    lado: Literal["Attacker", "Defender"] | None = None,
    filtros: Filtros = Depends(),
):
    # O `mapa` vem dos filtros comuns, mas aqui é obrigatório e único:
    # coordenadas só são comparáveis dentro do mesmo mapa.
    if not filtros.mapa or len(filtros.mapa) != 1:
        raise HTTPException(422, "Informe exatamente um mapa (?mapa=Ascent)")
    v = filtros.aplicar(_visao_heatmap(dados.base(), tipo))
    if jogador:
        v = v[v["puuid"] == jogador]
    if lado:
        v = v[v["lado"] == lado]
    v = v.dropna(subset=["x", "y"])  # sem posição (R5) ou fora do mapa (R6)
    return dados.para_json({"mapa": filtros.mapa[0], "tipo": tipo, "total": len(v), "pontos": v[["x", "y"]]},
                           casas=4)
