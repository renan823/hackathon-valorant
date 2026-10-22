"""Leitura dos JSONs de partidas de Valorant (formato match-v1 da Riot) em tabelas pandas.

As funções aqui apenas *achatam* os JSONs: os problemas dos dados brutos (observadores
sem estatísticas, strings vazias no lugar de valores ausentes, colunas constantes etc.)
são mantidos de propósito, pois o tratamento é feito passo a passo em
`notebooks/valorant-data-preparation.ipynb`.

Tabelas produzidas por `carregar_tabelas()`:
- `jogadores`: uma linha por jogador por partida (inclui observadores);
- `rounds`: uma linha por round, com a economia de atacantes e defensores;
- `economia`: uma linha por jogador por round (arma e armadura compradas);
- `abates`: uma linha por abate.
"""

import json
import re
from pathlib import Path

import numpy as np
import pandas as pd

# Raiz do repositório (este arquivo fica em packages/valorant-data/).
RAIZ = Path(__file__).resolve().parents[2]
PASTA_DADOS = RAIZ / "data"
ARQUIVO_REFERENCIA = RAIZ / "reference" / "valorant_reference.json"
# Bases tratadas geradas pelo notebook de preparação (não versionadas).
PASTA_PROCESSADOS = RAIZ / "outputs" / "processed"

# Ex.: RUSH2_030a_21-06-26_azure_bears_golden_13_x_9_ufmt_turuna_fracture
PADRAO_ARQUIVO = re.compile(
    r"^(?P<prefixo>.+?)_(?P<codigo>\d+[a-z]?)_(?P<data>\d\d-\d\d-\d\d)_"
    r"(?P<time_a>.+)_(?P<placar_a>\d+)_x_(?P<placar_b>\d+)_(?P<time_b>.+)_(?P<mapa>[a-z]+)$"
)

# Torneio a partir do prefixo do arquivo. A fase vem da pasta (as fases da Univavá
# ficam diretamente em data/, ex.: data/Classificatória 1/UNIVAVA_C1_...).
TORNEIOS = {
    "RUSHE": "Rush Series Esquenta",
    "RUSH2": "Rush Series Esquenta 2",
    "RUSH_INCLUSIVO": "Rush Series Inclusivo",
    "UNIVAVA": "Univavá",
}

# Janela usada para considerar uma morte como "trocada" no cálculo do KAST.
JANELA_TROCA_MS = 5000


def carregar_referencia():
    """Tabelas de UUID -> nome (agentes, armas, mapas, armaduras) do valorant-api.com."""
    with open(ARQUIVO_REFERENCIA, encoding="utf-8") as f:
        return json.load(f)


def listar_arquivos(pasta=PASTA_DADOS):
    return sorted(Path(pasta).rglob("*.json"))


def _formatar_time(slug):
    return slug.replace("_", " ").title()


def _info_arquivo(caminho, pasta):
    """Extrai torneio, fase, data e nomes dos times a partir do caminho do arquivo."""
    m = PADRAO_ARQUIVO.match(caminho.stem)
    if m is None:
        raise ValueError(f"Nome de arquivo fora do padrão: {caminho.name}")
    torneio = next((nome for prefixo, nome in TORNEIOS.items()
                    if m["prefixo"] == prefixo or m["prefixo"].startswith(prefixo + "_")), None)
    if torneio is None:
        raise ValueError(f"Prefixo de torneio desconhecido: {m['prefixo']} ({caminho.name})")
    return {
        "arquivo": caminho.name,
        "torneio": torneio,
        "fase": caminho.relative_to(pasta).parent.name or torneio,
        "codigo": m["codigo"],
        "data": pd.to_datetime(m["data"], format="%d-%m-%y"),
        "time_a": _formatar_time(m["time_a"]),
        "placar_a": int(m["placar_a"]),
        "time_b": _formatar_time(m["time_b"]),
        "placar_b": int(m["placar_b"]),
    }


def _nomes_dos_times(partida, info):
    """Associa os lados Red/Blue do JSON aos nomes dos times presentes no nome do arquivo.

    O JSON não traz o nome dos times; usamos o placar do arquivo para fazer a ligação.
    """
    rounds_ganhos = {t["teamId"]: t["roundsWon"] for t in partida["teams"]}
    nomes = {}
    for team_id, ganhos in rounds_ganhos.items():
        nomes[team_id] = info["time_a"] if ganhos == info["placar_a"] else info["time_b"]
    return nomes


def _papeis_no_round(rnd, times):
    """Retorna {teamId: 'Attacker'/'Defender'} usando o papel do vencedor do round."""
    vencedor, papel = rnd["winningTeam"], rnd["winningTeamRole"]
    outro = "Defender" if papel == "Attacker" else "Attacker"
    return {t: (papel if t == vencedor else outro) for t in times}


def _abate_valido(kill, time_do):
    """Spike, queda (killer = vítima) e teamkill aparecem em `kills`, mas não contam em stats.kills."""
    return kill["killer"] != kill["victim"] and time_do.get(kill["killer"]) != time_do.get(kill["victim"])


def _posicao(local):
    """Coordenadas cruas do jogo; (None, None) quando ausentes ({0, 0} na API)."""
    if not local or (local.get("x", 0), local.get("y", 0)) == (0, 0):
        return None, None
    return local["x"], local["y"]


def _classificar_compra(loadout_time, pistol):
    """Classificação de compra por valor total do time (critério usado pelo vlr.gg)."""
    if pistol:
        return "Pistol"
    if loadout_time < 5000:
        return "Eco"
    if loadout_time < 10000:
        return "Semi-eco"
    if loadout_time < 20000:
        return "Semi-buy"
    return "Full buy"


def _processar_partida(caminho, pasta, ref):
    with open(caminho, encoding="utf-8") as f:
        partida = json.load(f)

    info = _info_arquivo(caminho, pasta)
    mi = partida["matchInfo"]
    nomes = _nomes_dos_times(partida, info)
    vitoria = {t["teamId"]: t["won"] for t in partida["teams"]}
    rounds_ganhos = {t["teamId"]: t["roundsWon"] for t in partida["teams"]}
    times = list(nomes)

    base = {
        **{k: info[k] for k in ("arquivo", "torneio", "fase", "codigo", "data")},
        "match_id": mi["matchId"],
        "mapa": ref["maps"].get(mi["mapId"], mi["mapId"]),
        "versao_jogo": mi["gameVersion"],
        "duracao_min": mi["gameLengthMillis"] / 60000,
        "inicio": pd.to_datetime(mi["gameStartMillis"], unit="ms"),
        "regiao": mi["region"],
        "modo": mi["gameMode"].split("/")[-1].split(".")[0],
        "is_ranked": mi["isRanked"],
        "provisioning_flow": mi["provisioningFlowId"],
        "custom_game_name": mi["customGameName"],
        "queue_id": mi["queueId"],
        "n_rounds": len(partida["roundResults"]),
    }

    jogadores = {p["puuid"]: p for p in partida["players"]}
    time_do = {p["puuid"]: p["teamId"] for p in partida["players"]}

    # Acumuladores por jogador ao longo dos rounds.
    acum = {
        puuid: dict(dano=0, dano_recebido=0, headshots=0, bodyshots=0, legshots=0,
                    first_kills=0, first_deaths=0, plants=0, defuses=0, kast_rounds=0,
                    multikills=0, loadout_total=0, gasto_total=0)
        for puuid in jogadores
    }

    linhas_rounds, linhas_economia, linhas_abates = [], [], []

    for rnd in partida["roundResults"]:
        n = rnd["roundNum"]
        papeis = _papeis_no_round(rnd, times)
        abates = sorted(
            (k for ps in rnd["playerStats"] for k in ps["kills"]),
            key=lambda k: k["timeSinceRoundStartMillis"],
        )

        validos = [k for k in abates if _abate_valido(k, time_do)]

        # First kill / first death.
        if validos:
            acum[validos[0]["killer"]]["first_kills"] += 1
            acum[validos[0]["victim"]]["first_deaths"] += 1

        # KAST: kill, assist, survived ou traded. Morrer para a spike ou de queda tira o
        # "survived", mas não conta como kill nem pode ser trocado.
        mortos = {k["victim"]: k for k in abates}
        com_kill = {k["killer"] for k in validos}
        com_assist = {a for k in abates for a in k["assistants"]}
        trocados = set()
        for k in validos:
            for k2 in validos:
                if (k2["victim"] == k["killer"]
                        and 0 <= k2["timeSinceRoundStartMillis"] - k["timeSinceRoundStartMillis"] <= JANELA_TROCA_MS
                        and time_do.get(k2["killer"]) == time_do.get(k["victim"])):
                    trocados.add(k["victim"])

        economia_time = {t: dict(loadout=0, gasto=0, banco=0) for t in times}

        for ps in rnd["playerStats"]:
            puuid = ps["puuid"]
            a = acum[puuid]
            for dmg in ps["damage"]:
                if time_do.get(dmg["receiver"]) == time_do[puuid]:
                    continue  # ignora dano em aliados
                a["dano"] += dmg["damage"]
                a["headshots"] += dmg["headshots"]
                a["bodyshots"] += dmg["bodyshots"]
                a["legshots"] += dmg["legshots"]
                if dmg["receiver"] in acum:
                    acum[dmg["receiver"]]["dano_recebido"] += dmg["damage"]
            kills_validos = [k for k in ps["kills"] if time_do.get(k["victim"]) != time_do[puuid]]
            if len(kills_validos) >= 3:
                a["multikills"] += 1
            if (puuid in com_kill or puuid in com_assist
                    or puuid not in mortos or puuid in trocados):
                a["kast_rounds"] += 1

            eco = ps["economy"] or {}
            a["loadout_total"] += eco.get("loadoutValue", 0)
            a["gasto_total"] += eco.get("spent", 0)
            t = time_do[puuid]
            economia_time[t]["loadout"] += eco.get("loadoutValue", 0)
            economia_time[t]["gasto"] += eco.get("spent", 0)
            economia_time[t]["banco"] += eco.get("remaining", 0)

            linhas_economia.append({
                "match_id": mi["matchId"], "torneio": info["torneio"], "mapa": base["mapa"],
                "round": n + 1, "puuid": puuid, "time": nomes[t], "lado": papeis[t],
                "loadout": eco.get("loadoutValue"), "gasto": eco.get("spent"),
                "banco": eco.get("remaining"),
                # Mantemos o UUID cru: string vazia = valor ausente "escondido".
                "arma_uuid": eco.get("weapon"), "armadura_uuid": eco.get("armor"),
            })

        if rnd.get("bombPlanter"):
            acum[rnd["bombPlanter"]]["plants"] += 1
        if rnd.get("bombDefuser"):
            acum[rnd["bombDefuser"]]["defuses"] += 1

        atk = next(t for t in times if papeis[t] == "Attacker")
        dfn = next(t for t in times if papeis[t] == "Defender")
        pistol = n in (0, 12)
        plant_x, plant_y = _posicao(rnd.get("plantLocation")) if rnd.get("plantSite") else (None, None)
        linhas_rounds.append({
            **{k: base[k] for k in ("arquivo", "torneio", "fase", "match_id", "mapa")},
            "round": n + 1,
            "metade": "1ª metade" if n < 12 else ("2ª metade" if n < 24 else "Prorrogação"),
            "pistol": pistol,
            "time_atacante": nomes[atk], "time_defensor": nomes[dfn],
            "vencedor": nomes[rnd["winningTeam"]],
            "lado_vencedor": rnd["winningTeamRole"],
            "resultado": rnd["roundResult"],
            "resultado_codigo": rnd["roundResultCode"],
            "ceremonia": rnd["roundCeremony"],
            "plant_site": rnd["plantSite"],
            "plant_tempo_s": rnd["plantRoundTime"] / 1000,
            "defuse_tempo_s": rnd["defuseRoundTime"] / 1000,
            "planter": rnd.get("bombPlanter"),
            "plant_x": plant_x, "plant_y": plant_y,
            "n_abates": len(validos),
            "first_kill_atacante": bool(validos) and time_do[validos[0]["killer"]] == atk,
            "loadout_atk": economia_time[atk]["loadout"],
            "loadout_def": economia_time[dfn]["loadout"],
            "gasto_atk": economia_time[atk]["gasto"],
            "gasto_def": economia_time[dfn]["gasto"],
            "banco_atk": economia_time[atk]["banco"],
            "banco_def": economia_time[dfn]["banco"],
            "compra_atk": _classificar_compra(economia_time[atk]["loadout"], pistol),
            "compra_def": _classificar_compra(economia_time[dfn]["loadout"], pistol),
        })

        for k in abates:
            fd = k["finishingDamage"]
            vitima_x, vitima_y = _posicao(k.get("victimLocation"))
            pos_killer = next((pl["location"] for pl in k.get("playerLocations") or []
                               if pl["puuid"] == k["killer"]), None)
            killer_x, killer_y = _posicao(pos_killer)
            linhas_abates.append({
                "match_id": mi["matchId"], "torneio": info["torneio"], "mapa": base["mapa"],
                "round": n + 1, "tempo_round_s": k["timeSinceRoundStartMillis"] / 1000,
                "killer": k["killer"], "vitima": k["victim"],
                "valido": _abate_valido(k, time_do),
                "time_killer": nomes.get(time_do.get(k["killer"])),
                "lado_killer": papeis.get(time_do.get(k["killer"])),
                "n_assistencias": len(k["assistants"]),
                "tipo_dano": fd["damageType"], "item_dano": fd["damageItem"],
                "tiro_secundario": fd["isSecondaryFireMode"],
                "vitima_x": vitima_x, "vitima_y": vitima_y,
                "killer_x": killer_x, "killer_y": killer_y,
            })

    linhas_jogadores = []
    for p in partida["players"]:
        st = p["stats"] or {}
        casts = st.get("abilityCasts") or {}
        agente = ref["agents"].get((p["characterId"] or "").lower(), {})
        t = p["teamId"]
        adversario = next((nomes[o] for o in times if o != t), None) if t in nomes else None
        linha = {
            **base,
            "puuid": p["puuid"],
            "nick": f'{p["gameName"]}#{p["tagLine"]}',
            "party_id": p["partyId"],
            "team_id": t,
            "time": nomes.get(t),
            "adversario": adversario,
            "is_observer": p["isObserver"],
            "agente": agente.get("agente"),
            "funcao": agente.get("funcao"),
            "competitive_tier": p["competitiveTier"],
            "account_level": p["accountLevel"],
            "score": st.get("score"),
            "rounds_jogados": st.get("roundsPlayed"),
            "kills": st.get("kills"),
            "deaths": st.get("deaths"),
            "assists": st.get("assists"),
            "playtime_min": st["playtimeMillis"] / 60000 if st else None,
            "grenade_casts": casts.get("grenadeCasts"),
            "ability1_casts": casts.get("ability1Casts"),
            "ability2_casts": casts.get("ability2Casts"),
            "ultimate_casts": casts.get("ultimateCasts"),
            "rounds_ganhos_time": rounds_ganhos.get(t),
            "rounds_ganhos_adversario": next((rounds_ganhos[o] for o in times if o != t), None) if t in rounds_ganhos else None,
            "venceu": vitoria.get(t),
        }
        if st:
            linha.update(acum[p["puuid"]])
        linhas_jogadores.append(linha)

    return linhas_jogadores, linhas_rounds, linhas_economia, linhas_abates


def carregar_tabelas(pasta=PASTA_DADOS):
    """Lê todos os JSONs em `pasta` e devolve um dicionário de DataFrames brutos."""
    pasta = Path(pasta)
    ref = carregar_referencia()
    jog, rnd, eco, ab = [], [], [], []
    for caminho in listar_arquivos(pasta):
        j, r, e, a = _processar_partida(caminho, pasta, ref)
        jog += j
        rnd += r
        eco += e
        ab += a
    return {
        "jogadores": pd.DataFrame(jog),
        "rounds": pd.DataFrame(rnd),
        "economia": pd.DataFrame(eco),
        "abates": pd.DataFrame(ab),
    }


# --- Estilo dos gráficos -------------------------------------------------------------
# Paleta categórica em ordem fixa (validada para daltonismo nos pares adjacentes).
CORES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"]
# Cada função de agente tem sempre a mesma cor, em qualquer gráfico.
CORES_FUNCAO = {"Controlador": CORES[0], "Duelista": CORES[1], "Iniciador": CORES[2], "Sentinela": CORES[3]}
ORDEM_FUNCAO = list(CORES_FUNCAO)


def aplicar_estilo():
    """Configura matplotlib/seaborn com marcas finas, grade discreta e paleta fixa.

    Retorna (cmap_sequencial, cmap_divergente): azul claro->escuro para magnitudes e
    azul<->cinza<->vermelho (centrado em zero) para correlações.
    """
    import matplotlib as mpl
    import seaborn as sns
    from matplotlib.colors import LinearSegmentedColormap

    sns.set_theme(style="whitegrid", palette=CORES)
    mpl.rcParams.update({
        "figure.figsize": (7, 4.5), "figure.facecolor": "#fcfcfb", "axes.facecolor": "#fcfcfb",
        "axes.edgecolor": "#c3c2b7", "axes.labelcolor": "#52514e", "axes.titlecolor": "#0b0b0b",
        "axes.titleweight": "bold", "axes.titlesize": 12, "axes.prop_cycle": mpl.cycler(color=CORES),
        "grid.color": "#e1e0d9", "grid.linewidth": 0.6, "xtick.color": "#898781", "ytick.color": "#898781",
        "font.size": 11, "lines.linewidth": 2, "patch.edgecolor": "#fcfcfb", "patch.linewidth": 1,
        "axes.spines.top": False, "axes.spines.right": False,
    })
    seq = LinearSegmentedColormap.from_list(
        "azul", ["#cde2fb", "#86b6ef", "#3987e5", "#256abf", "#184f95", "#0d366b"])
    div = LinearSegmentedColormap.from_list(
        "azul_vermelho", ["#184f95", "#3987e5", "#f0efec", "#e66767", "#a8302f"])
    return seq, div


def nomear_itens(serie_uuid, ref, tipo):
    """Traduz UUIDs de armas ('weapons') ou armaduras ('gear') para nomes legíveis."""
    tabela = ref[tipo]
    campo = "arma" if tipo == "weapons" else None

    def traduz(u):
        if not isinstance(u, str) or u == "":
            return np.nan
        item = tabela.get(u.lower())
        if item is None:
            return u
        return item[campo] if campo else item

    return serie_uuid.map(traduz)
