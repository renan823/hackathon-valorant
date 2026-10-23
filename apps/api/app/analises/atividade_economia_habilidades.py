import math

import pandas as pd

from app.analises import analise, vazio

CASTS = ["grenade_casts", "ability1_casts", "ability2_casts", "ultimate_casts"]
LARGURA_INTERVALO = 0.5


@analise(
    id="atividade-economia-habilidades",
    titulo="Distribuição de casts por round",
    descricao=("Cada observação é um jogador em uma partida. A atividade é o total de casts dividido pelos "
               "rounds jogados; o loadout médio é o valor do equipamento dividido pelos mesmos rounds, não "
               "o gasto em habilidades. Cada barra mostra quantas jogador-partidas caem no intervalo de "
               "casts/round; os intervalos têm largura fixa de 0,5 e o histograma respeita os filtros. "
               "Os slots de habilidade variam entre agentes e não há dados de casts por round."),
    categoria="economia",
    grafico={"tipo": "atividade-economia", "x": "faixa_casts", "n": "jogador_partidas",
             "metricas": ["jogador_partidas", "win_pct"]},
)
def atividade_economia_habilidades(base, filtros):
    jogadores = filtros.aplicar(base.jogadores).copy()
    jogadores = jogadores[jogadores["rounds_jogados"].gt(0)].copy()
    if jogadores.empty:
        return vazio()

    jogadores["casts_total"] = jogadores[CASTS].fillna(0).sum(axis=1)
    jogadores["casts_por_round"] = jogadores["casts_total"] / jogadores["rounds_jogados"]
    jogadores["indice_faixa"] = (jogadores["casts_por_round"] / LARGURA_INTERVALO).apply(math.floor)
    jogadores["faixa_casts"] = jogadores["indice_faixa"].map(
        lambda indice: f"{indice * LARGURA_INTERVALO:.1f}–{(indice + 1) * LARGURA_INTERVALO:.1f}".replace(".", ",")
    )

    df = jogadores.groupby(["indice_faixa", "faixa_casts"], sort=True).agg(
        jogador_partidas=("puuid", "size"),
        vitorias=("venceu", "sum"),
        casts_total=("casts_total", "sum"),
        loadout_total=("loadout_total", "sum"),
        rounds_jogados=("rounds_jogados", "sum"),
    ).reset_index()
    df["loadout_medio"] = df["loadout_total"] / df["rounds_jogados"]
    df["win_pct"] = 100 * df["vitorias"] / df["jogador_partidas"]
    df = df.drop(columns="indice_faixa")
    quantidade = f"{len(jogadores):,}".replace(",", ".")
    largura = f"{LARGURA_INTERVALO:.1f}".replace(".", ",")
    return {
        "dados": df,
        "insight": (f"A análise considera {quantidade} jogador-partidas, agrupadas em intervalos de "
                    f"{largura} casts por round. As barras mostram a frequência por faixa; use o botão "
                    "para comparar win rate. Win rate e valor médio do equipamento também aparecem no "
                    "tooltip; faixas pequenas devem ser interpretadas com cautela."),
    }
