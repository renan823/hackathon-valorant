"""Consistência dos dados (validação de 21/10/2026, spec §5.1) como asserts sobre BASE.

Se alguém mexer no ETL (src/valorant_data.py) ou em dados.py e quebrar uma invariante, estes testes acusam.
Os critérios de colunas, coordenadas e Σ kills ficam em test_nucleo.py.
"""

import pytest

from app import dados

UUID = r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-"


@pytest.fixture(scope="module")
def base(cliente):
    return dados.base()


def test_partidas_unicas_e_com_dois_times(base):
    p = base.partidas
    assert p["match_id"].is_unique
    assert (p["time_a_id"] != p["time_b_id"]).all()
    assert (p["placar_a"] != p["placar_b"]).all()  # não há empate: a associação Red/Blue pelo placar é única (R2)
    assert set(p["time_a_id"]) | set(p["time_b_id"]) <= set(base.times["time_id"])


def test_cinco_contra_cinco(base):
    por_time = base.jogadores.groupby(["match_id", "time_id"]).size()
    assert (por_time == 5).all()
    assert (base.jogadores.groupby("match_id")["time_id"].nunique() == 2).all()


def test_placar_bate_com_rounds(base):
    r = base.rounds
    n_rounds = base.partidas.set_index("match_id")["n_rounds"]
    assert (r.groupby("match_id").size().reindex(n_rounds.index) == n_rounds).all()
    ganhos = r.groupby(["match_id", "vencedor_id"]).size()
    for p in base.partidas.itertuples():
        assert ganhos.get((p.match_id, p.time_a_id), 0) == p.placar_a  # 0 em partidas 13 x 0
        assert ganhos.get((p.match_id, p.time_b_id), 0) == p.placar_b
        assert p.vencedor_id == (p.time_a_id if p.placar_a > p.placar_b else p.time_b_id)


def test_rounds_sequenciais(base):
    for match_id, g in base.rounds.groupby("match_id"):
        assert sorted(g["round"]) == list(range(1, len(g) + 1)), match_id


def test_stats_rounds_jogados_igual_a_n_rounds(base):
    j = base.jogadores.merge(base.partidas[["match_id", "n_rounds"]], on="match_id", suffixes=("", "_p"))
    assert (j["rounds_jogados"] == j["n_rounds_p"]).all()


def test_lados_trocam_no_round_13(base):
    for match_id, g in base.rounds.sort_values("round").groupby("match_id"):
        primeira = g.loc[g["round"] <= 12, "time_atacante_id"]
        segunda = g.loc[g["round"].between(13, 24), "time_atacante_id"]
        assert primeira.nunique() == 1, match_id
        if len(segunda):
            assert segunda.nunique() == 1 and segunda.iloc[0] != primeira.iloc[0], match_id


def test_resultado_coerente_com_o_lado(base):
    r = base.rounds
    esperado = {"Bomb detonated": "Attacker", "Bomb defused": "Defender", "Round timer expired": "Defender"}
    for resultado, lado in esperado.items():
        assert (r.loc[r["resultado"] == resultado, "lado_vencedor"] == lado).all(), resultado


def test_plant_coerente(base):
    r = base.rounds
    assert (r["houve_plant"] == r["planter"].notna()).all()
    assert set(r["plant_site"].dropna()) <= {"A", "B", "C"}
    assert r.loc[r["houve_defuse"], "houve_plant"].all()  # só há defuse depois de um plant
    assert r.loc[r["houve_plant"], "agente_planter"].notna().all()


def test_uuids_traduzidos(base):
    j = base.jogadores
    assert j["agente"].notna().all() and j["funcao"].notna().all()
    for serie in (base.abates["meio"], base.economia["arma"].dropna(), base.economia["armadura"]):
        assert not serie.str.match(UUID).any(), serie.name


def test_first_kill_usa_so_abates_validos(base):
    """R10: um first kill/death por round com abate válido; n_abates conta só os válidos."""
    validos = base.abates[base.abates["valido"]].groupby(["match_id", "round"]).size()
    j = base.jogadores
    assert j["first_kills"].sum() == j["first_deaths"].sum() == len(validos)
    n = base.rounds.set_index(["match_id", "round"])["n_abates"]
    assert (n == validos.reindex(n.index, fill_value=0)).all()

    # Atribuição: o crédito é de quem fez/sofreu o primeiro abate *válido* de cada round.
    primeiros = (base.abates[base.abates["valido"]].sort_values("tempo_round_s", kind="stable")
                 .drop_duplicates(["match_id", "round"]))
    jj = j.set_index(["match_id", "puuid"])
    for coluna, quem in (("first_kills", "killer"), ("first_deaths", "vitima")):
        esperado = primeiros.groupby(["match_id", quem]).size().reindex(jj.index, fill_value=0)
        assert (jj[coluna] == esperado).all(), coluna
    r = base.rounds.set_index(["match_id", "round"])
    fk_atk = primeiros.set_index(["match_id", "round"])["killer_time_id"] == r["time_atacante_id"].reindex(
        primeiros.set_index(["match_id", "round"]).index)
    assert (r.loc[fk_atk.index, "first_kill_atacante"] == fk_atk).all()


def test_abates_invalidos_sao_spike_queda_ou_teamkill(base):
    a = base.abates
    invalidos = a[~a["valido"]]
    proprio = invalidos["killer"] == invalidos["vitima"]
    assert (proprio | (invalidos["killer_time_id"] == invalidos["vitima_time_id"])).all()
    assert len(invalidos) == 382 and proprio.sum() == 373  # R1
