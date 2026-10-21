"""Uma chamada por rota da spec §8 (completado na T4.1)."""


def test_saude(cliente):
    r = cliente.get("/api/saude")
    assert r.status_code == 200
    assert set(r.json()) == {"status", "partidas", "carregado_em"}
