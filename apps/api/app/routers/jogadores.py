"""Ranking, distribuição e perfil de jogadores (spec §8.2)."""

from typing import Literal

import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query

from app import dados
from app.filtros import Filtros
from app.metricas import METRICAS, agregar, ranking

router = APIRouter(prefix="/jogadores", tags=["jogadores"])

COLUNAS_RANKING = ["posicao", "puuid", "nick", "time_id", "time", "partidas", "vitorias", "win_pct", "rounds",
                   "kills", "deaths", "assists", "mais_menos", "acs", "adr", "kd", "kast_pct", "hs_pct",
                   "kpr", "apr", "fk_round", "fd_round", "multikills", "agente_principal", "funcao_principal"]
# Decisão D4 (plano do backend, §7): com 50 rounds o 1º lugar tinha só 3 partidas; com 100 o topo estabiliza.
MIN_ROUNDS_PADRAO = 100
CATEGORIAS_ARMAS = {"Rifle", "Sidearm", "Sniper", "SMG", "Heavy", "Shotgun", "Melee"}


def mais_frequente(df, chave, coluna):
    """Valor mais frequente de `coluna` para cada `chave` (empate: o que aparece primeiro)."""
    contagem = df.groupby([chave, coluna], sort=False).size().rename("n").reset_index()
    return contagem.sort_values("n", ascending=False, kind="stable").drop_duplicates(chave).set_index(chave)[coluna]


def linhas_ranking(j, ordenar="acs", ordem="desc", min_rounds=0, limite=None):
    """Uma linha por jogador com as métricas de `agregar` e time/agente principal nas linhas `j`."""
    m = agregar(j, ["puuid"]).set_index("puuid")
    m["nick"] = j.groupby("puuid")["nick"].first()
    m["time_id"] = mais_frequente(j, "puuid", "time_id")
    m["time"] = m["time_id"].map(dados.base().times.set_index("time_id")["nome"])
    m["agente_principal"] = mais_frequente(j, "puuid", "agente")
    m["funcao_principal"] = m["agente_principal"].map(j.drop_duplicates("agente").set_index("agente")["funcao"])
    return ranking(m.reset_index(), ordenar, ordem, min_rounds, limite)[COLUNAS_RANKING]


def _validar_metrica(metrica):
    if metrica not in METRICAS:
        raise HTTPException(422, f"Métrica desconhecida: {metrica}. Opções: {', '.join(METRICAS)}")


def _jogador(puuid):
    j = dados.base().jogadores
    j = j[j["puuid"] == puuid]
    if j.empty:
        raise HTTPException(404, "Jogador não encontrado")
    return j


@router.get("")
def ranking_jogadores(
    filtros: Filtros = Depends(),
    ordenar: str = Query("acs", description="Qualquer métrica de agregar()"),
    ordem: Literal["asc", "desc"] = "desc",
    min_rounds: int = Query(MIN_ROUNDS_PADRAO, ge=0),
    limite: int = Query(100, ge=1),
):
    _validar_metrica(ordenar)
    j = filtros.aplicar(dados.base().jogadores)
    return dados.para_json(linhas_ranking(j, ordenar, ordem, min_rounds, limite))


# Declarada antes de /{puuid} para "distribuicao" não ser lido como puuid.
@router.get("/distribuicao")
def distribuicao(
    filtros: Filtros = Depends(),
    metrica: str = "acs",
    bins: int = Query(20, ge=2, le=100),
    min_rounds: int = Query(MIN_ROUNDS_PADRAO, ge=0),
):
    _validar_metrica(metrica)
    valores = linhas_ranking(filtros.aplicar(dados.base().jogadores), min_rounds=min_rounds)[metrica].dropna()
    if valores.empty:
        return []
    contagem, bordas = np.histogram(valores, bins=bins)
    pct = 100 * contagem / contagem.sum()
    return dados.para_json([
        {"inicio": bordas[i], "fim": bordas[i + 1], "jogadores": contagem[i], "pct": pct[i],
         "pct_acumulado": pct[: i + 1].sum()}
        for i in range(len(contagem))
    ])


# (col_casts, agente) — None = todos os agentes
_SLOT_CAST = {
    "Ultimate":                ("ultimate_casts",  None),
    "Habilidade Q":            ("ability1_casts",  None),
    "Habilidade E":            ("ability2_casts",  None),
    "Habilidade C":            ("grenade_casts",   None),
    "Headhunter (Chamber)":    ("ability1_casts",  "Chamber"),
    "Tour de Force (Chamber)": ("ultimate_casts",  "Chamber"),
    "Overdrive (Neon)":        ("ultimate_casts",  "Neon"),
    "Chamber (habilidade)":    ("ability1_casts",  "Chamber"),
}


def calcular_arsenal(puuid: str, b) -> pd.DataFrame:
    a = b.abates
    e = b.economia
    dr = b.dano_round

    kills = a[a["valido"] & (a["killer"] == puuid)]
    armas = kills.groupby(["meio", "categoria_meio"]).size().rename("kills").reset_index()
    if armas.empty:
        return armas
    armas["pct"] = 100 * armas["kills"] / armas["kills"].sum()

    # --- Métricas de arma ---
    weapon_kills = kills[kills["categoria_meio"] != "Ability"]
    eco_df = (e[e["puuid"] == puuid][["match_id", "round", "arma"]]
              .rename(columns={"arma": "meio"}).drop_duplicates())
    kill_df = weapon_kills[["match_id", "round", "meio"]].drop_duplicates()
    union_df = pd.concat([eco_df, kill_df]).drop_duplicates()
    rounds_util = union_df.groupby("meio").size().rename("rounds_utilizados").reset_index()

    kill_tag = (weapon_kills.groupby(["match_id", "round", "meio"]).size()
                .reset_index(name="_n").assign(teve_kill=True)
                [["match_id", "round", "meio", "teve_kill"]])
    rounds_com_kill_wep = kill_tag.groupby("meio").size().rename("rounds_com_kill").reset_index()

    # KAST por arma — K/A/S/T nos rounds em que a arma foi usada
    kast_base = union_df.copy()
    rounds_com_qualquer_kill = kills[["match_id", "round"]].drop_duplicates().assign(teve_k=True)
    kast_base = kast_base.merge(rounds_com_qualquer_kill, on=["match_id", "round"], how="left")
    kast_base["teve_k"] = kast_base["teve_k"].fillna(False).astype(bool)

    dano_p = dr[dr["puuid"] == puuid][["match_id", "round", "dano"]]
    sem_kill = kills[["match_id", "round"]].drop_duplicates().assign(_teve_kill=True)
    a_rounds = (dano_p.merge(sem_kill, on=["match_id", "round"], how="left")
                .query("_teve_kill != True and dano > 50")
                [["match_id", "round"]].assign(teve_a=True))
    kast_base = kast_base.merge(a_rounds, on=["match_id", "round"], how="left")
    kast_base["teve_a"] = kast_base["teve_a"].fillna(False).astype(bool)

    deaths = (a[a["vitima"] == puuid][["match_id", "round"]]
              .drop_duplicates().assign(morreu=True))
    kast_base = kast_base.merge(deaths, on=["match_id", "round"], how="left")
    kast_base["morreu"] = kast_base["morreu"].fillna(False).astype(bool)
    kast_base["teve_s"] = ~kast_base["morreu"]

    p_deaths = (a[a["vitima"] == puuid]
                [["match_id", "round", "killer", "tempo_round_s", "vitima_time_id"]]
                .rename(columns={"killer": "meu_killer", "tempo_round_s": "t_minha_morte",
                                 "vitima_time_id": "meu_time"}))
    k_deaths = (a[["match_id", "round", "vitima", "tempo_round_s", "killer_time_id"]]
                .rename(columns={"vitima": "meu_killer", "tempo_round_s": "t_morte_killer",
                                 "killer_time_id": "time_matou_killer"}))
    trades = (p_deaths.merge(k_deaths, on=["match_id", "round", "meu_killer"])
              .query("0 <= t_morte_killer - t_minha_morte <= 3")
              .query("time_matou_killer == meu_time")
              [["match_id", "round"]].assign(teve_t=True))
    kast_base = kast_base.merge(trades, on=["match_id", "round"], how="left")
    kast_base["teve_t"] = kast_base["teve_t"].fillna(False).astype(bool)
    kast_base["kast_round"] = (kast_base["teve_k"] | kast_base["teve_a"]
                               | kast_base["teve_s"] | kast_base["teve_t"])
    kast_agg = (kast_base.groupby("meio")["kast_round"]
                .sum().rename("rounds_kast").reset_index())

    eco_load = (e[e["puuid"] == puuid][["match_id", "round", "arma", "loadout"]]
                .rename(columns={"arma": "meio"}))
    eco_eff = eco_load.groupby("meio").agg(total_loadout=("loadout", "sum")).reset_index()
    total_kills_wep = weapon_kills.groupby("meio").size().rename("total_kills").reset_index()
    eco_eff = eco_eff.merge(total_kills_wep, on="meio", how="left")
    eco_eff["total_kills"] = eco_eff["total_kills"].fillna(0)
    eco_eff["eficiencia_economia"] = 1000 * eco_eff["total_kills"] / eco_eff["total_loadout"]

    result = (armas
              .merge(rounds_util, on="meio", how="left")
              .merge(rounds_com_kill_wep, on="meio", how="left")
              .merge(kast_agg, on="meio", how="left")
              .merge(eco_eff[["meio", "eficiencia_economia"]], on="meio", how="left"))
    result["conversao_pct"] = 100 * result["rounds_com_kill"] / result["rounds_utilizados"]
    result["kast_pct"] = 100 * result["rounds_kast"] / result["rounds_utilizados"]
    result = result.drop(columns=["rounds_kast"])

    # Armas: partidas com kill
    partidas_wep = (weapon_kills.groupby("meio")["match_id"]
                    .nunique().rename("partidas_com_kill").reset_index())
    weapon_result = (result[result["categoria_meio"] != "Ability"].copy()
                     .merge(partidas_wep, on="meio", how="left"))

    # --- Métricas de habilidade (todas as usadas, mesmo sem kill) ---
    # Parte dos casts totais por slot, não apenas das habilidades que mataram.
    j_puuid = b.jogadores[b.jogadores["puuid"] == puuid]
    _SLOTS_TODOS = [
        ("Habilidade C", "grenade_casts",  None),
        ("Habilidade Q", "ability1_casts", None),
        ("Habilidade E", "ability2_casts", None),
        ("Ultimate",     "ultimate_casts", None),
    ] + [(m, col, ag) for m, (col, ag) in _SLOT_CAST.items() if ag]

    cast_rows = []
    for nome, col, agente_f in _SLOTS_TODOS:
        df = j_puuid[j_puuid["agente"] == agente_f] if agente_f else j_puuid
        total = int(df[col].sum()) if col in df.columns else 0
        if total > 0:
            cast_rows.append({"meio": nome, "categoria_meio": "Ability", "casts": total})

    if cast_rows:
        ability_result = pd.DataFrame(cast_rows)
        ability_kills = kills[kills["categoria_meio"] == "Ability"]
        total_kills_geral = armas["kills"].sum()

        if not ability_kills.empty:
            kills_ab = ability_kills.groupby("meio").size().rename("kills").reset_index()
            kills_ab["pct"] = 100 * kills_ab["kills"] / total_kills_geral
            rounds_ab = (ability_kills.drop_duplicates(["match_id", "round", "meio"])
                         .groupby("meio").size().rename("rounds_com_kill").reset_index())
            partidas_ab = (ability_kills.groupby("meio")["match_id"]
                           .nunique().rename("partidas_com_kill").reset_index())
            ability_result = (ability_result
                .merge(kills_ab[["meio", "kills", "pct"]], on="meio", how="left")
                .merge(rounds_ab, on="meio", how="left")
                .merge(partidas_ab, on="meio", how="left"))

        for col_name in ["kills", "pct", "rounds_com_kill", "partidas_com_kill"]:
            if col_name not in ability_result.columns:
                ability_result[col_name] = np.nan
        ability_result["kills"] = ability_result["kills"].fillna(0).astype(int)
        ability_result["pct"] = ability_result["pct"].fillna(0.0)
        ability_result["kills_por_cast"] = np.where(
            ability_result["casts"] > 0,
            ability_result["kills"] / ability_result["casts"],
            np.nan,
        )
        result = pd.concat([weapon_result, ability_result], ignore_index=True)
    else:
        result = weapon_result

    return result.sort_values("kills", ascending=False)


@router.get("/{puuid}")
def perfil(puuid: str):
    b = dados.base()
    j = _jogador(puuid)
    resumo = linhas_ranking(j).iloc[0].drop("posicao").to_dict()
    geral = linhas_ranking(b.jogadores, min_rounds=MIN_ROUNDS_PADRAO).set_index("puuid")["posicao"]
    resumo["posicao_ranking"] = geral.get(puuid)  # None abaixo do mínimo de rounds

    recentes = j.sort_values("inicio", ascending=False)
    nicks = [n for n in recentes["nick_partida"].unique() if n != resumo["nick"]]
    times = (j.groupby(["time_id", "time"]).size().rename("partidas").reset_index()
             .rename(columns={"time_id": "id", "time": "nome"}).sort_values("partidas", ascending=False))

    def por(chaves):
        cols = chaves + ["partidas", "vitorias", "win_pct", "rounds", "acs", "adr", "kd", "kast_pct"]
        return agregar(j, chaves).sort_values(["partidas", "acs"], ascending=False)[cols]

    armas = calcular_arsenal(puuid, b)

    evolucao = agregar(j, ["match_id"]).merge(j[["match_id", "data", "inicio", "mapa", "venceu"]], on="match_id")
    evolucao = evolucao.sort_values("inicio")[["match_id", "data", "mapa", "venceu", "acs", "adr", "kd", "kast_pct"]]

    return dados.para_json({
        "puuid": puuid, "nick": resumo["nick"], "nicks_anteriores": nicks,
        "times": times, "resumo": resumo,
        "por_agente": por(["agente", "funcao"]), "por_mapa": por(["mapa"]),
        "armas": armas.sort_values("kills", ascending=False), "evolucao": evolucao,
    })


@router.get("/{puuid}/partidas")
def historico(puuid: str):
    j = _jogador(puuid)
    info = j[["match_id", "data", "inicio", "torneio", "fase", "mapa", "time_id", "time", "adversario_id",
              "adversario", "rounds_ganhos_time", "rounds_ganhos_adversario", "venceu", "agente"]]
    m = agregar(j, ["match_id"]).merge(info, on="match_id").sort_values("inicio", ascending=False)
    m = m.rename(columns={"rounds_ganhos_time": "placar_time", "rounds_ganhos_adversario": "placar_adversario"})
    return dados.para_json(m[[
        "match_id", "data", "torneio", "fase", "mapa", "time_id", "time", "adversario_id", "adversario",
        "placar_time", "placar_adversario", "venceu", "agente", "kills", "deaths", "assists", "mais_menos",
        "acs", "adr", "kast_pct", "hs_pct", "first_kills", "multikills"]])


@router.get("/{puuid}/alvos")
def abates_por_alvo(puuid: str, por: Literal["funcao", "agente"] = Query("funcao")):
    """Participação de habilidades e armas nos abates válidos do jogador contra cada alvo."""
    _jogador(puuid)
    abates = dados.base().abates
    considerados = abates[
        abates["valido"]
        & (abates["killer"] == puuid)
        & (abates["categoria_meio"].eq("Ability") | abates["categoria_meio"].isin(CATEGORIAS_ARMAS))
    ]

    if por == "funcao":
        grupos = ["funcao_vitima"]
    else:
        grupos = ["agente_vitima", "funcao_vitima"]

    habilidades = considerados[considerados["categoria_meio"].eq("Ability")]
    armas = considerados[considerados["categoria_meio"].isin(CATEGORIAS_ARMAS)]
    resultado = pd.concat(
        [
            habilidades.groupby(grupos).size().rename("kills_habilidade"),
            armas.groupby(grupos).size().rename("kills_arma"),
            considerados.groupby(grupos).size().rename("kills_consideradas"),
        ],
        axis=1,
    ).fillna(0).reset_index()

    resultado = resultado.rename(columns={
        "funcao_vitima": "alvo" if por == "funcao" else "funcao",
        "agente_vitima": "alvo",
    })
    resultado[["kills_habilidade", "kills_arma", "kills_consideradas"]] = (
        resultado[["kills_habilidade", "kills_arma", "kills_consideradas"]].astype(int)
    )
    resultado["pct_habilidade"] = 100 * resultado["kills_habilidade"] / resultado["kills_consideradas"]
    resultado["pct_arma"] = 100 * resultado["kills_arma"] / resultado["kills_consideradas"]
    resultado = resultado.sort_values(["kills_consideradas", "alvo"], ascending=[False, True])
    return dados.para_json(resultado)
