## Hackathon Valorant

Análise de 336 partidas de campeonatos universitários de Valorant (Rush Series Esquenta, Esquenta 2, Inclusivo e Univavá).

### Estrutura

| caminho | conteúdo |
|---|---|
| `data/` | JSONs das partidas (formato match-v1 da Riot), um por mapa jogado |
| `reference/valorant_reference.json` | tradução de UUIDs de agentes, armas, armaduras e mapas ([valorant-api.com](https://valorant-api.com), pt-BR) |
| `valorant_data.py` | lê os JSONs e gera as tabelas `jogadores`, `rounds`, `economia` e `abates` |
| `valorant-data-preparation.ipynb` | limpeza e transformação dos dados (gera `processed/`) |
| `valorant-exploratory-data-analysis.ipynb` | análise exploratória e análise do contexto competitivo |
| `data-preparation.ipynb`, `exploratory-data-analysis.ipynb` | notebooks de aula originais (Iris/Boston), usados como roteiro |

### Como executar

```bash
uv venv .venv && uv pip install --python .venv/bin/python -r requirements.txt
# ou: python3 -m venv .venv && .venv/bin/pip install -r requirements.txt

.venv/bin/jupyter nbconvert --to notebook --execute --inplace valorant-data-preparation.ipynb
.venv/bin/jupyter nbconvert --to notebook --execute --inplace valorant-exploratory-data-analysis.ipynb
```

O notebook de preparação deve rodar primeiro: ele grava as bases tratadas em `processed/`, lidas pelo notebook de análise exploratória.
