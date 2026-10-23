"""Critérios de aceite da Fase 2 (docs/backend/tasks.md): routers de jogadores, partidas, times e geral."""

import pytest

from app import dados
from app.routers.jogadores import MIN_ROUNDS_PADRAO


@pytest.fixture(scope="module")
def base(cliente):
    return dados.base()


def ok(cliente, url, **params):
    r = cliente.get(url, params=params)
    assert r.status_code == 200, r.text
    return r.json()


# --- jogadores (T2.1–T2.4) -------------------------------------------------------------

def test_ranking_padrao(cliente):
    r = ok(cliente, "/api/jogadores")
    assert len(r) == 100 and all(x["rounds"] >= MIN_ROUNDS_PADRAO for x in r)
    acs = [x["acs"] for x in r]
    assert acs == sorted(acs, reverse=True) and r[0]["posicao"] == 1
    assert {"agente_principal", "funcao_principal", "time"} <= set(r[0])


def test_ranking_ordenar_e_filtros(cliente):
    kd = [x["kd"] for x in ok(cliente, "/api/jogadores", ordenar="kd")]
    assert kd == sorted(kd, reverse=True)
    assert cliente.get("/api/jogadores", params={"ordenar": "xyz"}).status_code == 422
    geral = {x["puuid"]: x["acs"] for x in ok(cliente, "/api/jogadores", min_rounds=0, limite=1000)}
    ascent = ok(cliente, "/api/jogadores", mapa="Ascent", min_rounds=0, limite=1000)
    assert any(geral[x["puuid"]] != x["acs"] for x in ascent)


def test_distribuicao(cliente):
    d = ok(cliente, "/api/jogadores/distribuicao", bins=10)
    assert len(d) == 10 and sum(x["jogadores"] for x in d) == 222  # jogadores com 100+ rounds (D4)
    assert d[-1]["pct_acumulado"] == pytest.approx(100)


def test_perfil_jogador(cliente, base):
    j = base.jogadores
    nicks = j.groupby("puuid")["nick_partida"].nunique()
    puuid = nicks[nicks == 2].index[0]
    p = ok(cliente, f"/api/jogadores/{puuid}")
    assert len(p["nicks_anteriores"]) == 1
    validos = base.abates[base.abates["valido"] & (base.abates["killer"] == puuid)]
    assert sum(a["kills"] for a in p["armas"]) == len(validos) == p["resumo"]["kills"]
    assert len(p["evolucao"]) == p["resumo"]["partidas"]

    multi = j.groupby("puuid")["time_id"].nunique()
    assert len(ok(cliente, f"/api/jogadores/{multi[multi > 1].index[0]}")["times"]) > 1

    rounds = j.groupby("puuid")["rounds_jogados"].sum()
    abaixo = rounds[rounds < MIN_ROUNDS_PADRAO].index[0]
    assert ok(cliente, f"/api/jogadores/{abaixo}")["resumo"]["posicao_ranking"] is None
    assert cliente.get("/api/jogadores/nao-existe").status_code == 404


def test_historico_jogador(cliente, base):
    puuid = base.jogadores["puuid"].value_counts().index[0]
    h = ok(cliente, f"/api/jogadores/{puuid}/partidas")
    linhas = base.jogadores[base.jogadores["puuid"] == puuid]
    assert len(h) == len(linhas)
    assert [x["data"] for x in h] == sorted((x["data"] for x in h), reverse=True)
    assert sum(x["kills"] for x in h) == linhas["kills"].sum()


@pytest.mark.parametrize("por,coluna", [("funcao", "funcao_vitima"), ("agente", "agente_vitima")])
def test_abates_por_alvo_jogador(cliente, base, por, coluna):
    puuid = base.abates.loc[base.abates["valido"], "killer"].value_counts().index[0]
    resposta = ok(cliente, f"/api/jogadores/{puuid}/alvos", por=por)
    armas = {"Rifle", "Sidearm", "Sniper", "SMG", "Heavy", "Shotgun", "Melee"}
    esperados = base.abates[
        base.abates["valido"]
        & base.abates["killer"].eq(puuid)
        & (base.abates["categoria_meio"].eq("Ability") | base.abates["categoria_meio"].isin(armas))
    ]
    assert sum(l["kills_consideradas"] for l in resposta) == len(esperados)
    assert {l["alvo"] for l in resposta} == set(esperados[coluna].dropna())
    for linha in resposta:
        alvo = esperados[esperados[coluna].eq(linha["alvo"])]
        n_habilidade = int(alvo["categoria_meio"].eq("Ability").sum())
        n_arma = int(alvo["categoria_meio"].isin(armas).sum())
        assert linha["kills_habilidade"] == n_habilidade
        assert linha["kills_arma"] == n_arma
        assert linha["kills_consideradas"] == n_habilidade + n_arma
        assert linha["pct_habilidade"] == pytest.approx(
            100 * n_habilidade / (n_habilidade + n_arma), abs=0.01
        )
        assert linha["pct_habilidade"] + linha["pct_arma"] == pytest.approx(100)


def test_abates_por_alvo_jogador_valida_parametros(cliente):
    puuid = dados.base().jogadores["puuid"].iloc[0]
    assert cliente.get(f"/api/jogadores/{puuid}/alvos", params={"por": "mapa"}).status_code == 422
    assert cliente.get("/api/jogadores/nao-existe/alvos").status_code == 404


# --- partidas (T2.5–T2.9) --------------------------------------------------------------

def test_lista_partidas(cliente):
    p = ok(cliente, "/api/partidas")
    assert len(p) == 336 and [x["data"] for x in p] == sorted((x["data"] for x in p), reverse=True)
    assert len(ok(cliente, "/api/partidas", time="ufmt_turuna")) == 36
    assert all(x["mvp"]["acs"] > 0 for x in p)


@pytest.fixture(scope="module")
def match_id(base):
    return base.partidas["match_id"].iloc[0]


def test_placar(cliente, base, match_id):
    s = ok(cliente, f"/api/partidas/{match_id}")
    linha = base.partidas.set_index("match_id").loc[match_id]
    assert [t["placar"] for t in s["times"]] == [linha["placar_a"], linha["placar_b"]]
    for t in s["times"]:
        assert len(t["jogadores"]) == 5 and t["atk_rounds"] + t["def_rounds"] == t["placar"]
    assert cliente.get("/api/partidas/nao-existe").status_code == 404


def test_rounds_da_partida(cliente, base, match_id):
    r = ok(cliente, f"/api/partidas/{match_id}/rounds")
    assert len(r) == base.partidas.set_index("match_id").loc[match_id, "n_rounds"]
    a = base.abates[(base.abates["match_id"] == match_id) & base.abates["valido"]]
    primeiro = a[a["round"] == 1].sort_values("tempo_round_s").iloc[0]
    assert r[0]["first_kill"]["killer"]["puuid"] == primeiro["killer"]


def test_abates_da_partida(cliente, base, match_id):
    a = ok(cliente, f"/api/partidas/{match_id}/abates")
    assert len(a["abates"]) == (base.abates["match_id"] == match_id).sum()
    for k in a["abates"]:
        for pos in (k["killer_pos"], k["vitima_pos"]):
            assert pos is None or (0 <= pos["x"] <= 1 and 0 <= pos["y"] <= 1)


def test_duelos(cliente, base, match_id):
    d = ok(cliente, f"/api/partidas/{match_id}/duelos")
    validos = ((base.abates["match_id"] == match_id) & base.abates["valido"]).sum()
    assert sum(x["total"] for x in d["arestas"]) == validos == sum(n["kills"] for n in d["nos"])
    assert len(d["nos"]) == 10


# --- times (T2.10–T2.12) ---------------------------------------------------------------

def test_ranking_times_bate_com_eda(cliente):
    t = ok(cliente, "/api/times", min_partidas=8)
    topo = [(x["nome"], x["vitorias"], x["derrotas"], x["saldo_rounds"]) for x in t[:5]]
    assert topo[:3] == [("Ceub Octopus", 9, 0, 76), ("Macklogic Red", 10, 1, 52), ("Ufu Saints", 14, 4, 66)]
    assert [x[0] for x in topo[3:]] == ["Axis Anteaters", "Azure Bears Golden"]
    assert all(0 <= x["atk_win_pct"] <= 100 for x in t)


def test_perfil_time(cliente):
    p = ok(cliente, "/api/times/ufmt_turuna")
    assert p["resumo"]["partidas"] == 36
    assert sum(m["partidas"] for m in p["por_mapa"]) == 36 == sum(c["partidas"] for c in p["confrontos"])
    assert sum(c["partidas"] for c in p["composicoes"]) == 36 and all(len(c["agentes"]) == 5 for c in p["composicoes"])
    assert {e["compra"] for e in p["economia"]} <= {"Pistol", "Eco", "Semi-eco", "Semi-buy", "Full buy"}
    assert cliente.get("/api/times/nao-existe").status_code == 404


def test_partidas_do_time(cliente):
    assert len(ok(cliente, "/api/times/ufmt_turuna/partidas")) == 36
    assert len(ok(cliente, "/api/times/ufmt_turuna/partidas", mapa="Ascent")) < 36


# --- geral (T2.13–T2.15) ---------------------------------------------------------------

def test_busca(cliente):
    r = ok(cliente, "/api/busca", q="unicamp")
    assert {"unicamp_tritons_red", "unicamp_tritons_black"} <= {x["id"] for x in r if x["tipo"] == "time"}
    assert ok(cliente, "/api/busca", q="UNIVAVÁ") == ok(cliente, "/api/busca", q="univava")
    assert len(ok(cliente, "/api/busca", q="an")) <= 10
    assert cliente.get("/api/busca", params={"q": "a"}).status_code == 422


def test_heatmap(cliente, base):
    assert ok(cliente, "/api/heatmap", mapa="Ascent", tipo="plants")["total"] == 1049
    jett = ok(cliente, "/api/heatmap", mapa="Ascent", tipo="mortes", agente="Jett")
    a = base.abates
    assert jett["total"] == ((a["mapa"] == "Ascent") & (a["agente_vitima"] == "Jett") & a["vitima_x"].notna()).sum()
    kills = ok(cliente, "/api/heatmap", mapa="Ascent", tipo="kills")
    assert kills["total"] == ((a["mapa"] == "Ascent") & a["valido"] & a["killer_x"].notna()).sum()
    assert all(0 <= p["x"] <= 1 and 0 <= p["y"] <= 1 for p in kills["pontos"])
    habilidades = ok(cliente, "/api/heatmap", mapa="Lotus", tipo="ability_kills")
    ability = a[(a["mapa"] == "Lotus") & a["valido"] & a["categoria_meio"].eq("Ability")]
    assert habilidades["total"] == ability["killer_x"].notna().sum()
    assert habilidades["partidas"] == ability.loc[ability["killer_x"].notna(), "match_id"].nunique()
    assert habilidades["total"] == len(habilidades["pontos"])

    mortes_habilidade = ok(cliente, "/api/heatmap", mapa="Lotus", tipo="ability_deaths")
    assert mortes_habilidade["total"] == ability["vitima_x"].notna().sum()
    assert mortes_habilidade["partidas"] == ability.loc[ability["vitima_x"].notna(), "match_id"].nunique()
    vitimas = ability.dropna(subset=["vitima_x", "vitima_y"])
    assert mortes_habilidade["pontos"] == [
        {"x": round(x, 4), "y": round(y, 4)} for x, y in vitimas[["vitima_x", "vitima_y"]].itertuples(index=False)
    ]
    filtrado_vitima = ok(
        cliente, "/api/heatmap", mapa="Lotus", tipo="ability_deaths", agente="Jett"
    )
    assert filtrado_vitima["total"] == ability[
        ability["agente_vitima"].eq("Jett")
    ]["vitima_x"].notna().sum()

    pos_plant = ok(cliente, "/api/heatmap", mapa="Lotus", tipo="postplant_ability_kills")
    pos_plantos = ability.merge(
        base.rounds[["match_id", "round", "plant_tempo_s"]],
        on=["match_id", "round"], how="inner",
    )
    pos_plantos = pos_plantos[
        pos_plantos["plant_tempo_s"].notna()
        & (pos_plantos["tempo_round_s"] >= pos_plantos["plant_tempo_s"])
    ]
    pos_plantos = pos_plantos.dropna(subset=["killer_x", "killer_y"])
    assert pos_plant["total"] == len(pos_plantos) == 190
    assert pos_plant["partidas"] == pos_plantos["match_id"].nunique()
    assert pos_plant["total"] == len(pos_plant["pontos"])
    assert ok(cliente, "/api/heatmap", mapa="Lotus", tipo="ability_kills", funcao="Duelista")["total"] < habilidades["total"]

    pos_plant_mortes = ok(cliente, "/api/heatmap", mapa="Lotus", tipo="postplant_ability_deaths")
    pos_plantos_vitimas = ability.merge(
        base.rounds[["match_id", "round", "plant_tempo_s"]],
        on=["match_id", "round"], how="inner",
    )
    pos_plantos_vitimas = pos_plantos_vitimas[
        pos_plantos_vitimas["plant_tempo_s"].notna()
        & (pos_plantos_vitimas["tempo_round_s"] >= pos_plantos_vitimas["plant_tempo_s"])
    ].dropna(subset=["vitima_x", "vitima_y"])
    assert pos_plant_mortes["total"] == len(pos_plantos_vitimas)
    assert pos_plant_mortes["partidas"] == pos_plantos_vitimas["match_id"].nunique()
    assert pos_plant_mortes["pontos"] == [
        {"x": round(x, 4), "y": round(y, 4)}
        for x, y in pos_plantos_vitimas[["vitima_x", "vitima_y"]].itertuples(index=False)
    ]
    assert cliente.get("/api/heatmap").status_code == 422
    assert cliente.get("/api/heatmap", params={"mapa": ["Ascent", "Haven"]}).status_code == 422
    assert cliente.get("/api/heatmap", params={"mapa": "Lotus", "tipo": "ability_casts"}).status_code == 422


def test_resumo(cliente):
    r = ok(cliente, "/api/resumo")
    assert r["contadores"] == {"partidas": 336, "jogadores": 411, "times": 68, "rounds": 6618, "abates": 46371}
    assert len(r["ultimas_partidas"]) == 8 and len(r["top_jogadores"]) == 5 and len(r["top_times"]) == 5
    assert r["top_times"][0]["nome"] == "Ceub Octopus"
