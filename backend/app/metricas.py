"""Métricas agregadas para qualquer agrupamento (spec §6).

Sempre soma antes de dividir (pondera pelos rounds), nunca média de médias.
"""

# Colunas somadas da tabela jogadores antes de calcular as razões.
SOMAS = ["score", "rounds_jogados", "kills", "deaths", "assists", "dano", "headshots", "bodyshots",
         "legshots", "first_kills", "first_deaths", "kast_rounds", "multikills"]

# Métricas que `agregar` devolve e pelas quais o ranking pode ordenar.
METRICAS = ("partidas", "vitorias", "win_pct", "rounds", "kills", "deaths", "assists", "mais_menos",
            "acs", "adr", "kd", "kast_pct", "hs_pct", "kpr", "dpr", "apr", "fk_round", "fd_round",
            "first_kills", "first_deaths", "multikills")


def _razao(numerador, denominador):
    """Divisão por zero vira NaN (null no JSON), em vez de inf."""
    return (numerador / denominador).where(denominador > 0)


def agregar(jogadores, chaves):
    """Agrega linhas jogador × partida por `chaves` e calcula as métricas da spec §6."""
    grupos = jogadores.groupby(chaves, sort=False)
    df = grupos[SOMAS].sum().rename(columns={"rounds_jogados": "rounds"})
    df["partidas"] = grupos["match_id"].nunique()
    # Conta partidas vencidas (não linhas): agregando por time, cada partida tem 5 linhas.
    df["vitorias"] = (jogadores[jogadores["venceu"]].groupby(chaves)["match_id"].nunique()
                      .reindex(df.index, fill_value=0))
    df["win_pct"] = 100 * df["vitorias"] / df["partidas"]

    r = df["rounds"]
    df["acs"] = _razao(df["score"], r)
    df["adr"] = _razao(df["dano"], r)
    df["kd"] = _razao(df["kills"], df["deaths"])
    df["kast_pct"] = 100 * _razao(df["kast_rounds"], r)
    df["hs_pct"] = 100 * _razao(df["headshots"], df["headshots"] + df["bodyshots"] + df["legshots"])
    df["kpr"] = _razao(df["kills"], r)
    df["dpr"] = _razao(df["deaths"], r)
    df["apr"] = _razao(df["assists"], r)
    df["fk_round"] = _razao(df["first_kills"], r)
    df["fd_round"] = _razao(df["first_deaths"], r)
    df["mais_menos"] = df["kills"] - df["deaths"]
    return df.reset_index()


def ranking(df, ordenar="acs", ordem="desc", min_rounds=0, limite=None):
    """Aplica `min_rounds`, ordena (nulos por último) e adiciona a coluna `posicao`."""
    if ordenar not in df.columns:
        raise ValueError(f"Métrica desconhecida: {ordenar}")
    df = df[df["rounds"] >= min_rounds] if "rounds" in df.columns else df
    df = df.sort_values(ordenar, ascending=(ordem == "asc"), na_position="last", kind="stable")
    df = df.reset_index(drop=True)
    df.insert(0, "posicao", range(1, len(df) + 1))
    return df.head(limite) if limite else df
