"""Uma chamada por rota da spec §8 (critério de pronto da spec §9) e os números de conferência da EDA."""

import pytest

from app import dados

# (rota no OpenAPI, query string, chaves esperadas). Chaves num set → resposta é objeto;
# set dentro de lista → resposta é lista e o primeiro item tem essas chaves.
ROTAS = [
    ("/api/saude", "", {"status", "partidas", "carregado_em"}),
    ("/api/filtros", "", {"torneios", "mapas", "times", "agentes", "funcoes"}),
    ("/api/resumo", "", {"contadores", "kpis", "ultimas_partidas", "top_jogadores", "top_times"}),
    ("/api/busca", "q=azure", [{"tipo", "id", "nome", "detalhe"}]),
    ("/api/heatmap", "mapa=Ascent", {"mapa", "tipo", "total", "partidas", "pontos"}),
    ("/api/jogadores", "", [{"posicao", "puuid", "nick", "acs", "kd", "kast_pct", "agente_principal"}]),
    ("/api/jogadores/distribuicao", "", [{"inicio", "fim", "jogadores", "pct", "pct_acumulado"}]),
    ("/api/jogadores/{puuid}", "", {"puuid", "nick", "nicks_anteriores", "times", "resumo", "por_agente",
                                    "por_mapa", "armas", "evolucao"}),
    ("/api/jogadores/{puuid}/partidas", "", [{"match_id", "data", "mapa", "venceu", "agente", "acs"}]),
    ("/api/jogadores/{puuid}/alvos", "", [{"alvo", "kills_arma", "kills_habilidade", "kills_consideradas",
                                            "pct_arma", "pct_habilidade"}]),
    ("/api/times", "", [{"posicao", "time_id", "nome", "partidas", "win_pct", "saldo_rounds", "atk_win_pct"}]),
    ("/api/times/{time_id}", "", {"time_id", "nome", "torneios", "resumo", "elenco", "por_mapa", "composicoes",
                                  "confrontos", "economia"}),
    ("/api/times/{time_id}/partidas", "", [{"match_id", "time_a", "time_b", "vencedor_id", "mvp"}]),
    ("/api/partidas", "", [{"match_id", "torneio", "fase", "data", "mapa", "time_a", "time_b", "mvp"}]),
    ("/api/partidas/{match_id}", "", {"partida", "times"}),
    ("/api/partidas/{match_id}/rounds", "", [{"round", "vencedor_id", "lado_vencedor", "compra_atk", "first_kill"}]),
    ("/api/partidas/{match_id}/abates", "", {"mapa", "abates"}),
    ("/api/partidas/{match_id}/duelos", "", {"nos", "arestas"}),
    ("/api/analises", "", [{"id", "titulo", "categoria", "grafico"}]),
    ("/api/analises/{analise_id}", "", {"id", "titulo", "grafico", "dados", "insight", "kpi"}),
]

ROTAS_404 = ["/api/jogadores/{x}", "/api/jogadores/{x}/partidas", "/api/jogadores/{x}/alvos",
             "/api/times/{x}", "/api/times/{x}/partidas",
             "/api/partidas/{x}", "/api/partidas/{x}/rounds", "/api/partidas/{x}/abates", "/api/partidas/{x}/duelos",
             "/api/analises/{x}"]


@pytest.fixture(scope="module")
def ids(cliente):
    b = dados.base()
    return {"puuid": b.jogadores["puuid"].value_counts().index[0], "time_id": "ufmt_turuna",
            "match_id": b.partidas["match_id"].iloc[0], "analise_id": "lado-por-mapa"}


def test_smoke_cobre_todas_as_rotas(cliente):
    assert {r[0] for r in ROTAS} == set(cliente.get("/openapi.json").json()["paths"])


@pytest.mark.parametrize("rota,query,chaves", ROTAS, ids=[r[0] for r in ROTAS])
def test_rota_responde(cliente, ids, rota, query, chaves):
    r = cliente.get(rota.format(**ids) + (f"?{query}" if query else ""))
    assert r.status_code == 200, r.text
    corpo = r.json()
    if isinstance(chaves, list):
        assert isinstance(corpo, list) and corpo, "lista vazia"
        corpo, chaves = corpo[0], chaves[0]
    assert chaves <= set(corpo), chaves - set(corpo)


@pytest.mark.parametrize("rota", ROTAS_404)
def test_recurso_inexistente_404(cliente, rota):
    assert cliente.get(rota.format(x="nao-existe")).status_code == 404


def test_numeros_de_conferencia(cliente):
    """Spec §9: os agregados da API batem com a EDA e com stats.kills."""
    kpis = {k["analise_id"]: k["valor"] for k in cliente.get("/api/resumo").json()["kpis"]}
    assert kpis["lado-por-mapa"] == pytest.approx(51.8, abs=0.05)
    assert kpis["pistol"] == pytest.approx(86.5, abs=0.05)

    ranking = cliente.get("/api/jogadores", params={"min_rounds": 0, "limite": 10_000}).json()
    validos = int(dados.base().abates["valido"].sum())
    assert sum(j["kills"] for j in ranking) == validos == 46371
