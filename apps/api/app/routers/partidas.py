"""Lista de partidas e detalhes de uma partida: placar, rounds, abates e duelos (spec §8.4)."""

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException

from app import dados
from app.filtros import Filtros
from app.metricas import agregar

router = APIRouter(prefix="/partidas", tags=["partidas"])

COLUNAS_PLACAR = ["puuid", "nick", "agente", "funcao", "kills", "deaths", "assists", "mais_menos", "acs", "adr",
                  "kast_pct", "hs_pct", "first_kills", "first_deaths", "multikills"]


def listar_partidas(partidas):
    """Formato `Partida` da spec (mais recentes primeiro), com o MVP (maior ACS) de cada uma."""
    j = dados.base().jogadores
    j = j[j["match_id"].isin(partidas["match_id"])].assign(acs=lambda d: d["score"] / d["rounds_jogados"])
    mvp = j.loc[j.groupby("match_id")["acs"].idxmax()].set_index("match_id")[["puuid", "nick", "acs"]]
    return [
        {
            **{c: getattr(p, c) for c in ("match_id", "torneio", "fase", "codigo", "serie_id", "data", "mapa")},
            "time_a": {"id": p.time_a_id, "nome": p.time_a, "placar": p.placar_a},
            "time_b": {"id": p.time_b_id, "nome": p.time_b, "placar": p.placar_b},
            "vencedor_id": p.vencedor_id, "n_rounds": p.n_rounds, "duracao_min": p.duracao_min,
            "mvp": mvp.loc[p.match_id].to_dict() if p.match_id in mvp.index else None,
        }
        for p in partidas.sort_values("data", ascending=False, kind="stable").itertuples()
    ]


def _partida(match_id):
    p = dados.base().partidas
    p = p[p["match_id"] == match_id]
    if p.empty:
        raise HTTPException(404, "Partida não encontrada")
    return p


def _pessoa(puuid, nicks, times):
    return {"puuid": puuid, "nick": nicks.get(puuid), "time_id": times.get(puuid)}


@router.get("")
def lista(filtros: Filtros = Depends()):
    p = filtros.aplicar(dados.base().partidas, col_time=("time_a_id", "time_b_id"))
    return dados.para_json(listar_partidas(p))


@router.get("/{match_id}")
def placar(match_id: str):
    b = dados.base()
    p = _partida(match_id)
    j = b.jogadores[b.jogadores["match_id"] == match_id]
    r = b.rounds[b.rounds["match_id"] == match_id]
    linha = p.iloc[0]
    times = []
    for lado in ("a", "b"):
        time_id = linha[f"time_{lado}_id"]
        jt = j[j["time_id"] == time_id]
        ganhos = r[r["vencedor_id"] == time_id]
        jogadores = agregar(jt, ["puuid", "nick", "agente", "funcao"]).sort_values("acs", ascending=False)
        times.append({
            "id": time_id, "nome": linha[f"time_{lado}"], "placar": linha[f"placar_{lado}"],
            "venceu": linha["vencedor_id"] == time_id,
            "atk_rounds": (ganhos["lado_vencedor"] == "Attacker").sum(),
            "def_rounds": (ganhos["lado_vencedor"] == "Defender").sum(),
            "pistols": ganhos["pistol"].sum(),
            "first_kills": jt["first_kills"].sum(),
            "jogadores": jogadores[COLUNAS_PLACAR],
        })
    return dados.para_json({"partida": listar_partidas(p)[0], "times": times})


@router.get("/{match_id}/rounds")
def rounds(match_id: str):
    b = dados.base()
    _partida(match_id)
    j = b.jogadores[b.jogadores["match_id"] == match_id]
    nicks, times = j.set_index("puuid")["nick"], j.set_index("puuid")["time_id"]
    a = b.abates[(b.abates["match_id"] == match_id) & b.abates["valido"]]
    primeiros = a.sort_values("tempo_round_s").drop_duplicates("round").set_index("round")
    r = b.rounds[b.rounds["match_id"] == match_id].sort_values("round")
    colunas = ["round", "metade", "pistol", "time_atacante_id", "time_defensor_id", "vencedor_id", "lado_vencedor",
               "resultado", "ceremonia", "houve_plant", "plant_site", "houve_defuse", "compra_atk", "compra_def",
               "loadout_atk", "loadout_def"]
    saida = []
    for linha in r[colunas].to_dict("records"):
        fk = primeiros.loc[linha["round"]] if linha["round"] in primeiros.index else None
        linha["first_kill"] = None if fk is None else {
            "killer": _pessoa(fk["killer"], nicks, times), "vitima": _pessoa(fk["vitima"], nicks, times),
            "tempo_s": fk["tempo_round_s"]}
        saida.append(linha)
    return dados.para_json(saida)


@router.get("/{match_id}/abates")
def abates(match_id: str):
    b = dados.base()
    p = _partida(match_id)
    j = b.jogadores[b.jogadores["match_id"] == match_id]
    nicks, times = j.set_index("puuid")["nick"], j.set_index("puuid")["time_id"]
    a = b.abates[b.abates["match_id"] == match_id].sort_values(["round", "tempo_round_s"])

    def pos(x, y):
        return None if pd.isna(x) or pd.isna(y) else {"x": x, "y": y}

    return dados.para_json({
        "mapa": p["mapa"].iloc[0],
        "abates": [
            {"round": k.round, "tempo_s": k.tempo_round_s, "valido": k.valido,
             "killer": _pessoa(k.killer, nicks, times), "vitima": _pessoa(k.vitima, nicks, times),
             "meio": k.meio, "categoria_meio": k.categoria_meio, "assistencias": k.n_assistencias,
             "killer_pos": pos(k.killer_x, k.killer_y), "vitima_pos": pos(k.vitima_x, k.vitima_y)}
            for k in a.itertuples()
        ],
    }, casas=4)


@router.get("/{match_id}/duelos")
def duelos(match_id: str):
    b = dados.base()
    _partida(match_id)
    j = b.jogadores[b.jogadores["match_id"] == match_id]
    a = b.abates[(b.abates["match_id"] == match_id) & b.abates["valido"]]
    # Cada par de jogadores vira uma aresta não direcionada, com os abates de cada lado.
    par = a[["killer", "vitima"]].apply(sorted, axis=1, result_type="expand").set_axis(["a", "b"], axis=1)
    par["de_a"] = a["killer"] == par["a"]
    arestas = (par.groupby(["a", "b"])["de_a"].agg(kills_a="sum", total="size").reset_index()
               .assign(kills_b=lambda d: d["total"] - d["kills_a"]))
    return dados.para_json({
        "nos": [{"id": x.puuid, "nick": x.nick, "time_id": x.time_id, "agente": x.agente, "kills": x.kills}
                for x in j.itertuples()],
        "arestas": arestas[["a", "b", "kills_a", "kills_b", "total"]],
    })
