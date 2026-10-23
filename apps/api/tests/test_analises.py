"""Critérios de aceite da Fase 3 (docs/backend/tasks.md): registro de análises e valores de referência da EDA."""

import pkgutil

import pytest

from app import dados
from app import analises
from app.analises import REGISTRO, analise


def executar(cliente, analise_id, **params):
    r = cliente.get(f"/api/analises/{analise_id}", params=params)
    assert r.status_code == 200, r.text
    return r.json()


def linha(dados, **chave):
    return next(d for d in dados if all(d[k] == v for k, v in chave.items()))


# --- T3.1 registro ---------------------------------------------------------------------

def test_autoimport_registra_um_analise_por_arquivo(cliente):
    modulos = {m.name for m in pkgutil.iter_modules(analises.__path__)}
    assert len(modulos) == len(REGISTRO) == 11
    lista = cliente.get("/api/analises").json()
    assert {a["id"] for a in lista} == set(REGISTRO)
    assert all("funcao" not in a and {"titulo", "categoria", "grafico"} <= set(a) for a in lista)


def test_nova_analise_aparece_sem_mexer_em_rotas(cliente):
    @analise(id="teste-temporaria", titulo="Teste", categoria="teste", grafico={"tipo": "tabela"})
    def temporaria(base, filtros):
        return {"dados": filtros.aplicar(base.partidas)[["match_id", "mapa"]]}
    try:
        assert "teste-temporaria" in {a["id"] for a in cliente.get("/api/analises").json()}
        assert {d["mapa"] for d in executar(cliente, "teste-temporaria", mapa="Haven")["dados"]} == {"Haven"}
        with pytest.raises(ValueError):
            analise(id="teste-temporaria", titulo="", categoria="", grafico={})(temporaria)
    finally:
        del REGISTRO["teste-temporaria"]


def test_analise_desconhecida_404(cliente):
    assert cliente.get("/api/analises/nao-existe").status_code == 404


@pytest.mark.parametrize("analise_id", [
    "impacto-habilidades",
    "atividade-economia-habilidades",
    "equipe-partida-habilidades",
    "uso-habilidades-jogadores",
])
def test_analises_removidas_nao_aparecem_nem_respondem(cliente, analise_id):
    ids = {analise["id"] for analise in cliente.get("/api/analises").json()}
    assert analise_id not in ids
    assert cliente.get(f"/api/analises/{analise_id}").status_code == 404


@pytest.mark.parametrize("analise_id", sorted(REGISTRO))
def test_filtros_sem_dados_nao_quebram(cliente, analise_id):
    r = executar(cliente, analise_id, time="time_que_nao_existe")
    assert r["dados"] == []


# --- T3.2–T3.10 valores de referência (EDA, depois da correção R10) --------------------

def test_lado_por_mapa(cliente):
    r = executar(cliente, "lado-por-mapa")
    assert r["kpi"]["valor"] == pytest.approx(51.8, abs=0.05)
    assert linha(r["dados"], mapa="Ascent")["atk_win_pct"] < 50
    assert [d["mapa"] for d in executar(cliente, "lado-por-mapa", mapa="Ascent")["dados"]] == ["Ascent"]


def test_first_kill(cliente):
    r = executar(cliente, "first-kill")
    assert linha(r["dados"], quem_abriu="Ataque")["atk_win_pct"] == pytest.approx(75.5, abs=0.1)
    assert linha(r["dados"], quem_abriu="Defesa")["atk_win_pct"] == pytest.approx(32.2, abs=0.1)


def test_pistol(cliente):
    assert executar(cliente, "pistol")["kpi"]["valor"] == pytest.approx(86.5, abs=0.05)


def test_vantagem_economica(cliente):
    d = executar(cliente, "vantagem-economica")["dados"]
    assert linha(d, faixa="-2 mil a +2 mil")["atk_win_pct"] == pytest.approx(49, abs=1)
    assert 16 <= d[0]["atk_win_pct"] <= 19 and 81 <= d[-1]["atk_win_pct"] <= 86
    assert [x["atk_win_pct"] for x in d] == sorted(x["atk_win_pct"] for x in d)  # monotônica (curva em S)


def test_compras(cliente):
    d = executar(cliente, "compras")["dados"]
    assert linha(d, compra_atk="Full buy", compra_def="Full buy")["atk_win_pct"] == pytest.approx(50, abs=1)


def test_meta_armas(cliente):
    r = executar(cliente, "meta-armas")
    assert linha(r["dados"], meio="Vandal")["pct"] == pytest.approx(37.6, abs=0.05)
    assert linha(r["dados"], meio="Phantom")["pct"] == pytest.approx(24.3, abs=0.05)
    jett = executar(cliente, "meta-armas", agente="Jett")["dados"]
    assert sum(x["kills"] for x in jett) < sum(x["kills"] for x in r["dados"])


def test_meta_agentes(cliente):
    r = executar(cliente, "meta-agentes")
    assert r["insight"].startswith("Omen") and "588" in r["insight"]
    assert all(0 < d["pick_rate"] <= 100 for d in r["dados"])


def test_metricas_vitoria(cliente):
    d = executar(cliente, "metricas-vitoria")["dados"]
    assert d[0]["metrica"] == "kast_pct" and d[0]["r"] == pytest.approx(0.59, abs=0.01)


def test_plant_sites(cliente):
    d = executar(cliente, "plant-sites")["dados"]
    assert [linha(d, mapa="Haven", plant_site=s)["plants"] for s in "CAB"] == [464, 404, 148]
    assert [linha(d, mapa="Lotus", plant_site=s)["plants"] for s in "CAB"] == [546, 482, 226]


def test_conversao_habilidades_compara_resultados_por_primeiro_abate_e_lado(cliente):
    r = executar(cliente, "conversao-habilidades")
    assert r["grafico"]["n"] == "team_rounds"
    assert r["grafico"]["indicadores"] == ["vitorias", "abates_habilidade"]
    assert r["grafico"]["referencia"] == 50
    assert "linha tracejada = 50%" in r["grafico"]["rotulo_y"]
    assert r["grafico"]["rotulo_valor"] is True
    assert {"situacao_habilidade", "lado", "team_rounds", "vitorias",
            "abates_habilidade", "win_pct"} <= set(r["dados"][0])
    assert {d["situacao_habilidade"] for d in r["dados"]} == {
        "Habilidade fez o primeiro abate",
        "Habilidade fez outro abate",
        "Nenhum abate por habilidade",
    }
    assert sum(d["team_rounds"] for d in r["dados"]) == 2 * len(dados.base().rounds)
    ascent = executar(cliente, "conversao-habilidades", mapa="Ascent")
    assert sum(d["team_rounds"] for d in ascent["dados"]) == 2 * len(
        dados.base().rounds[dados.base().rounds["mapa"].eq("Ascent")]
    )
    assert "Cada barra mostra a porcentagem de rounds vencidos" in r["insight"]
    assert "golpe final do abate, não o momento de uso" in r["insight"]


def test_jogador_partida_agrega_taxas_por_agente_funcao_e_mapa(cliente):
    base = dados.base()
    jogadores = base.jogadores[base.jogadores["rounds_jogados"].gt(0)]
    r = executar(cliente, "jogador-partida-habilidades")
    assert {"mapa", "agente", "funcao", "jogador_partidas", "rounds",
            "casts_por_round", "acs", "adr", "kast_pct", "win_pct"} <= set(r["dados"][0])
    assert sum(d["jogador_partidas"] for d in r["dados"]) == len(jogadores)
    assert sum(d["rounds"] for d in r["dados"]) == jogadores["rounds_jogados"].sum()
    jett = executar(cliente, "jogador-partida-habilidades", agente="Jett")
    assert {d["agente"] for d in jett["dados"]} == {"Jett"}


def test_perfil_compara_uso_habilidades_com_medias_por_funcao_e_agente(cliente):
    base = dados.base()
    jogador_ref = base.jogadores.loc[base.jogadores["agente"].eq("Jett"), "puuid"].iloc[0]
    perfil = cliente.get(f"/api/jogadores/{jogador_ref}").json()
    linha_jogador = linha(perfil["por_agente"], agente="Jett", funcao="Duelista")
    assert {
        "casts_por_round", "media_funcao", "media_agente", "diferenca_funcao", "diferenca_agente",
        "jogadores_funcao", "jogadores_agente", "abaixo_funcao", "abaixo_agente",
    } <= set(linha_jogador)

    jogador = base.jogadores[
        (base.jogadores["puuid"] == jogador_ref)
        & (base.jogadores["agente"] == "Jett")
        & (base.jogadores["funcao"] == "Duelista")
        & (base.jogadores["rounds_jogados"] > 0)
    ]
    casts = jogador[["grenade_casts", "ability1_casts", "ability2_casts", "ultimate_casts"]].fillna(0).sum().sum()
    assert linha_jogador["casts_por_round"] == pytest.approx(
        casts / jogador["rounds_jogados"].sum(), abs=0.005
    )

    funcao = base.jogadores[base.jogadores["rounds_jogados"] > 0]
    taxas_funcao = (
        funcao.assign(
            casts=funcao[["grenade_casts", "ability1_casts", "ability2_casts", "ultimate_casts"]]
            .fillna(0).sum(axis=1)
        )
        .groupby(["puuid", "funcao"], as_index=False)
        .agg(casts=("casts", "sum"), rounds=("rounds_jogados", "sum"))
    )
    taxas_funcao["casts_por_round"] = taxas_funcao["casts"] / taxas_funcao["rounds"]
    assert linha_jogador["media_funcao"] == pytest.approx(
        taxas_funcao[taxas_funcao["funcao"] == "Duelista"]["casts_por_round"].mean(), abs=0.005
    )
    taxas_agente = (
        funcao.assign(
            casts=funcao[["grenade_casts", "ability1_casts", "ability2_casts", "ultimate_casts"]]
            .fillna(0).sum(axis=1)
        )
        .groupby(["puuid", "agente", "funcao"], as_index=False)
        .agg(casts=("casts", "sum"), rounds=("rounds_jogados", "sum"))
    )
    taxas_agente["casts_por_round"] = taxas_agente["casts"] / taxas_agente["rounds"]
    assert linha_jogador["media_agente"] == pytest.approx(
        taxas_agente[taxas_agente["agente"] == "Jett"]["casts_por_round"].mean(), abs=0.005
    )

    duelistas = base.jogadores[base.jogadores["rounds_jogados"] > 0]
    taxas_funcao = (
        duelistas.assign(
            casts=duelistas[["grenade_casts", "ability1_casts", "ability2_casts", "ultimate_casts"]]
            .fillna(0).sum(axis=1)
        )
        .groupby(["puuid", "funcao"], as_index=False)
        .agg(casts=("casts", "sum"), rounds=("rounds_jogados", "sum"))
    )
    taxas_funcao["casts_por_round"] = taxas_funcao["casts"] / taxas_funcao["rounds"]
    assert linha_jogador["media_funcao"] == pytest.approx(
        taxas_funcao[taxas_funcao["funcao"] == "Duelista"]["casts_por_round"].mean(), abs=0.005
    )
    assert linha_jogador["jogadores_funcao"] == len(
        taxas_funcao[taxas_funcao["funcao"] == "Duelista"]
    )

    abaixo = (
        linha_jogador["casts_por_round"] < linha_jogador["media_funcao"],
        linha_jogador["casts_por_round"] < linha_jogador["media_agente"],
    )
    assert linha_jogador["abaixo_funcao"] is abaixo[0]
    assert linha_jogador["abaixo_agente"] is abaixo[1]
    assert linha_jogador["abaixo_funcao"] is abaixo[0]
    assert linha_jogador["abaixo_agente"] is abaixo[1]


# --- KPIs da Home (T2.15) --------------------------------------------------------------

def test_resumo_traz_os_kpis_das_analises(cliente):
    kpis = cliente.get("/api/resumo").json()["kpis"]
    assert [k["analise_id"] for k in kpis] == ["lado-por-mapa", "pistol", "first-kill", "meta-armas"]
    assert kpis[1]["valor"] == pytest.approx(86.45, abs=0.01) and kpis[1]["unidade"] == "%"
