"""Critérios de aceite da Fase 1 (docs/backend/tasks.md): mapas, dados, filtros e métricas."""

import numpy as np
import pandas as pd
import pytest

from app import dados, mapas
from app.filtros import Filtros
from app.metricas import agregar, ranking

# Colunas garantidas pelo contrato do plano (§3.1).
CONTRATO = {
    "partidas": ["codigo", "serie_id", "time_a_id", "time_a", "placar_a", "time_b_id", "time_b", "placar_b",
                 "vencedor_id", "n_rounds", "duracao_min"],
    "jogadores": ["puuid", "nick", "time_id", "time", "adversario_id", "agente", "funcao", "venceu", "score",
                  "rounds_jogados", "kills", "deaths", "assists", "dano", "headshots", "bodyshots", "legshots",
                  "first_kills", "first_deaths", "kast_rounds", "multikills"],
    "rounds": ["round", "time_atacante_id", "time_defensor_id", "vencedor_id", "lado_vencedor", "pistol",
               "compra_atk", "compra_def", "loadout_atk", "loadout_def", "houve_plant", "houve_defuse",
               "plant_site", "planter", "agente_planter", "funcao_planter", "plant_x", "plant_y",
               "first_kill_atacante"],
    "abates": ["round", "tempo_round_s", "killer", "vitima", "valido", "killer_time_id", "vitima_time_id",
               "lado_killer", "lado_vitima", "meio", "categoria_meio", "agente_killer", "funcao_killer",
               "agente_vitima", "funcao_vitima", "n_assistencias", "killer_x", "killer_y", "vitima_x", "vitima_y"],
    "times": ["time_id", "nome", "torneios"],
    "economia": ["time_id", "arma", "armadura"],
}


@pytest.fixture(scope="module")
def base(cliente):
    return dados.base()


# --- T1.4 mapas ------------------------------------------------------------------------

def test_normalizar_descarta_fora_do_mapa():
    # Ascent: o ponto (0, 0) do jogo cai dentro; um ponto muito distante, fora.
    x, y = mapas.normalizar("Ascent", pd.Series([0.0, 1e6, None]), pd.Series([0.0, 1e6, 5.0]))
    assert x.iloc[0] == pytest.approx(0.813895) and 0 <= y.iloc[0] <= 1
    assert x.iloc[1:].isna().all() and y.iloc[1:].isna().all()


def test_coordenadas_normalizadas(base):
    plants = base.rounds[base.rounds["houve_plant"]]
    assert plants["plant_x"].notna().all() and len(plants) == 4653
    for col in ("plant_x", "plant_y", "killer_x", "killer_y", "vitima_x", "vitima_y"):
        tabela = base.rounds if col.startswith("plant") else base.abates
        assert tabela[col].dropna().between(0, 1).all()
    descartados = base.abates["vitima_x"].isna().sum() + base.abates["killer_x"].isna().sum() - 444
    assert descartados <= 47


# --- T1.5a/T1.5b dados -----------------------------------------------------------------

def test_tamanhos(base):
    assert len(base.partidas) == 336 and base.partidas["match_id"].is_unique
    assert base.jogadores["puuid"].nunique() == 411
    assert len(base.times) == 68


@pytest.mark.parametrize("tabela", list(CONTRATO))
def test_contrato_de_colunas(base, tabela):
    df = getattr(base, tabela)
    colunas = CONTRATO[tabela] + ([] if tabela == "times" else ["match_id", "torneio", "fase", "data", "mapa"])
    assert not set(colunas) - set(df.columns)


def test_ids_de_time_batem_com_o_arquivo(base):
    ids_arquivo = set(base.partidas["time_a_id"]) | set(base.partidas["time_b_id"])
    assert ids_arquivo == set(base.times["time_id"]) == set(base.jogadores["time_id"])


def test_kills_validos_batem_com_stats(base):
    validos = base.abates[base.abates["valido"]].groupby(["match_id", "killer"]).size()
    kills = base.jogadores.set_index(["match_id", "puuid"])["kills"]
    assert (kills - validos.reindex(kills.index, fill_value=0) == 0).all()


def test_meio_nunca_nulo(base):
    assert base.abates["meio"].notna().all() and base.abates["categoria_meio"].notna().all()
    assert (base.abates["meio"] == "Chamber (habilidade)").sum() == 169


def test_nick_mais_recente_unico_por_jogador(base):
    assert (base.jogadores.groupby("puuid")["nick"].nunique() == 1).all()


# --- T1.6 saída ------------------------------------------------------------------------

def test_para_json_converte_tipos():
    df = pd.DataFrame({"i": [1], "b": [True], "f": [1.23456], "n": [np.nan], "d": [pd.Timestamp("2026-06-27")]})
    obj = {"df": df, "s": pd.Series({"a": np.int64(3)}), "x": np.bool_(False), "l": (np.float64(2.5), pd.NaT)}
    assert dados.para_json(obj) == {
        "df": [{"i": 1, "b": True, "f": 1.23, "n": None, "d": "2026-06-27"}],
        "s": {"a": 3}, "x": False, "l": [2.5, None]}
    assert dados.para_json(0.123456, casas=4) == 0.1235


def test_partida_bruta(base):
    match_id = base.partidas["match_id"].iloc[0]
    assert dados.partida_bruta(match_id)["matchInfo"]["matchId"] == match_id
    with pytest.raises(KeyError):
        dados.partida_bruta("nao-existe")


# --- T1.7 filtros ----------------------------------------------------------------------

@pytest.fixture
def df_filtros():
    return pd.DataFrame({"mapa": ["Ascent", "Haven", "Lotus"], "time_id": ["a", "b", "c"],
                         "time_atacante_id": ["a", "x", "y"], "time_defensor_id": ["z", "b", "y"]})


def test_filtros_sem_valores_devolve_tudo(df_filtros):
    assert len(Filtros().aplicar(df_filtros)) == 3


def test_filtros_multiplos_valores_e_coluna_ausente(df_filtros):
    assert list(Filtros(mapa=["Ascent", "Lotus"], agente=["Omen"]).aplicar(df_filtros)["mapa"]) == ["Ascent", "Lotus"]


def test_filtros_time_em_tupla_aplica_ou(df_filtros):
    f = Filtros(time=["a", "b"])
    assert list(f.aplicar(df_filtros, col_time=("time_atacante_id", "time_defensor_id"))["mapa"]) == ["Ascent", "Haven"]


# --- T1.8 métricas ---------------------------------------------------------------------

def test_agregar_soma_antes_de_dividir(base):
    j = base.jogadores
    puuid = j["puuid"].value_counts().index[0]
    linhas = j[j["puuid"] == puuid]
    m = agregar(j, ["puuid"]).set_index("puuid").loc[puuid]
    assert m["acs"] == pytest.approx(linhas["score"].sum() / linhas["rounds_jogados"].sum())
    assert m["adr"] == pytest.approx(linhas["dano"].sum() / linhas["rounds_jogados"].sum())
    assert m["kd"] == pytest.approx(linhas["kills"].sum() / linhas["deaths"].sum())
    assert m["kast_pct"] == pytest.approx(100 * linhas["kast_rounds"].sum() / linhas["rounds_jogados"].sum())
    assert m["partidas"] == len(linhas) and m["vitorias"] == linhas["venceu"].sum()


def test_agregar_por_partida_reproduz_csv(base):
    csv = dados.RAIZ / "outputs" / "processed" / "jogadores.csv"
    if not csv.exists():
        pytest.skip("rode o notebook de preparação para gerar outputs/processed/")
    esperado = pd.read_csv(csv).set_index(["match_id", "puuid"])["acs"]
    obtido = agregar(base.jogadores, ["match_id", "puuid"]).set_index(["match_id", "puuid"])["acs"]
    assert np.allclose(obtido.reindex(esperado.index), esperado)


def test_agregar_por_time_conta_partidas_e_nao_linhas(base):
    t = agregar(base.jogadores, ["time_id"]).set_index("time_id").loc["ufmt_turuna"]
    assert t["partidas"] == 36 and t["vitorias"] == 23


def test_ranking_min_rounds_e_posicao(base):
    r = ranking(agregar(base.jogadores, ["puuid"]), min_rounds=50)
    assert len(r) == 329 and list(r["posicao"][:3]) == [1, 2, 3]
    assert r["acs"].is_monotonic_decreasing
    with pytest.raises(ValueError):
        ranking(r, ordenar="xyz")


def test_divisao_por_zero_vira_nulo():
    df = pd.DataFrame({"puuid": ["p"], "match_id": ["m"], "venceu": [True],
                       **{c: [0] for c in ["score", "rounds_jogados", "kills", "deaths", "assists", "dano",
                                           "headshots", "bodyshots", "legshots", "first_kills",
                                           "first_deaths", "kast_rounds", "multikills"]}})
    m = agregar(df, ["puuid"]).iloc[0]
    assert pd.isna(m["kd"]) and pd.isna(m["acs"]) and pd.isna(m["hs_pct"])


# --- T1.9 /api/filtros -----------------------------------------------------------------

def test_api_filtros(cliente):
    r = cliente.get("/api/filtros")
    assert r.status_code == 200
    f = r.json()
    assert len(f["torneios"]) == 4
    assert next(t for t in f["torneios"] if t["nome"] == "Univavá")["fases"] == [
        "Classificatória 1", "Classificatória 2", "Classificatória 3", "Classificatória 4", "Fase de Grupos"]
    assert len(f["mapas"]) == 10 and "Bind" not in f["mapas"] and "Icebox" not in f["mapas"]
    assert len(f["times"]) == 68 and len(f["agentes"]) == 28 and len(f["funcoes"]) == 4
