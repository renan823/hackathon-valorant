"""Métricas agregadas para qualquer agrupamento (spec §6).

Sempre soma antes de dividir (pondera pelos rounds), nunca média de médias.
"""

# Colunas somadas da tabela jogadores antes de calcular as razões.
SOMAS = ["score", "rounds_jogados", "kills", "deaths", "assists", "dano", "headshots", "bodyshots",
         "legshots", "first_kills", "first_deaths", "kast_rounds", "multikills"]


def agregar(jogadores, chaves):
    """Devolve `chaves` + partidas, vitorias, rounds, acs, adr, kd, kast_pct, hs_pct, kpr, dpr, apr,
    fk_round, fd_round, win_pct e mais_menos (T1.8)."""
    raise NotImplementedError("T1.8")


def ranking(df, ordenar="acs", ordem="desc", min_rounds=0, limite=None):
    """Aplica `min_rounds`, ordena e adiciona a coluna `posicao` (T1.8)."""
    raise NotImplementedError("T1.8")
