"""Registro das análises plugáveis (spec §8.5).

Cada arquivo desta pasta define uma análise com o decorator `@analise`:

    @analise(id="lado-por-mapa", titulo="…", categoria="mapas", grafico={"tipo": "barras", "x": …, "y": …})
    def lado_por_mapa(base, filtros):
        return {"dados": DataFrame, "insight": "texto", "kpi": {…} (opcional)}

Os módulos são importados automaticamente no fim deste arquivo: criar o arquivo basta para a análise
aparecer em /api/analises.
"""

import importlib
import pkgutil

# id → {id, titulo, descricao, categoria, grafico, funcao}
REGISTRO = {}


def analise(id, titulo, categoria, grafico, descricao=""):
    """Registra a função decorada em REGISTRO."""
    def registrar(funcao):
        if id in REGISTRO:
            raise ValueError(f"Análise duplicada: {id}")
        REGISTRO[id] = {"id": id, "titulo": titulo, "descricao": descricao, "categoria": categoria,
                        "grafico": grafico, "funcao": funcao}
        return funcao
    return registrar


def metadados(registro):
    return {k: v for k, v in registro.items() if k != "funcao"}


def pct(valor):
    """Percentual no formato dos textos: 51.83 -> '51,8%'."""
    return f"{valor:.1f}%".replace(".", ",")


def kpi(titulo, valor, descricao, unidade="%"):
    return {"titulo": titulo, "valor": valor, "unidade": unidade, "descricao": descricao}


def vazio():
    """Resposta padrão quando os filtros não deixam dados (ex.: time que nunca jogou no mapa)."""
    return {"dados": [], "insight": "Sem dados para os filtros escolhidos."}


def tercis(valores):
    """Classifica observações em faixas baixa, média e alta dentro do recorte atual."""
    percentil = valores.rank(method="average", pct=True)
    return percentil.map(lambda p: "Baixa" if p <= 1 / 3 else "Média" if p <= 2 / 3 else "Alta")


# Colunas de time da tabela rounds: o filtro `time` vale para quem atacou OU defendeu.
TIMES_ROUND = ("time_atacante_id", "time_defensor_id")
# Abaixo disso, a amostra por mapa é pequena demais para comparar (R8).
MIN_PARTIDAS_MAPA = 5


# Autoimport: roda depois de `analise` existir, então os módulos podem importá-lo daqui.
for _modulo in pkgutil.iter_modules(__path__):
    importlib.import_module(f"{__name__}.{_modulo.name}")
