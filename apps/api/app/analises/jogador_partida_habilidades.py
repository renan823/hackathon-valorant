import pandas as pd

from app.analises import analise, vazio

CASTS = ["grenade_casts", "ability1_casts", "ability2_casts", "ultimate_casts"]
SOMAS = ["score", "dano", "kills", "deaths", "assists", "kast_rounds", "first_kills", "rounds_jogados"]


@analise(
    id="jogador-partida-habilidades",
    titulo="Atividade e desempenho por agente e mapa",
    descricao=("Agrega observações jogador-partida por agente, função e mapa. Casts por round usam a exposição "
               "total em rounds; habilidade 1/2 são slots específicos do agente, não habilidades equivalentes."),
    categoria="jogadores",
    grafico={"tipo": "tabela",
             "colunas": ["mapa", "agente", "funcao", "jogador_partidas", "partidas", "rounds",
                         "casts_por_round", "grenade_casts_round", "ability1_casts_round",
                         "ability2_casts_round", "ultimate_casts_round", "acs", "adr", "kd",
                         "kast_pct", "apr", "fk_round", "win_pct"]},
)
def jogador_partida_habilidades(base, filtros):
    jogadores = filtros.aplicar(base.jogadores).copy()
    jogadores = jogadores[jogadores["rounds_jogados"].gt(0)].copy()
    if jogadores.empty:
        return vazio()
    jogadores[CASTS] = jogadores[CASTS].fillna(0)
    jogadores["casts_total"] = jogadores[CASTS].sum(axis=1)
    jogadores["vitoria"] = jogadores["venceu"].astype(int)
    grupos = jogadores.groupby(["mapa", "agente", "funcao"], dropna=False, sort=False)
    df = grupos.agg(
        jogador_partidas=("puuid", "size"),
        partidas=("match_id", "nunique"),
        vitorias=("vitoria", "sum"),
        casts_total=("casts_total", "sum"),
        **{coluna: (coluna, "sum") for coluna in [*CASTS, *SOMAS]},
    ).reset_index()
    denominador = df["rounds_jogados"]
    df["casts_por_round"] = df["casts_total"] / denominador
    for coluna in CASTS:
        df[f"{coluna}_round"] = df[coluna] / denominador
    df["rounds"] = denominador
    df["acs"] = df["score"] / denominador
    df["adr"] = df["dano"] / denominador
    df["kd"] = df["kills"] / df["deaths"].where(df["deaths"].gt(0))
    df["kast_pct"] = 100 * df["kast_rounds"] / denominador
    df["apr"] = df["assists"] / denominador
    df["fk_round"] = df["first_kills"] / denominador
    df["win_pct"] = 100 * df["vitorias"] / df["jogador_partidas"]
    df = df.sort_values(["mapa", "funcao", "agente"], ignore_index=True)
    return {
        "dados": df,
        "insight": ("Casts e métricas são taxas agregadas sobre rounds jogados. O win% usa jogador-partida como "
                    "unidade; trata-se de associação descritiva, não efeito causal das habilidades."),
    }
