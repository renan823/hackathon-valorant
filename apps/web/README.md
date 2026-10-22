# VAVA Stats (frontend)

Dashboard do circuito universitário de Valorant, no estilo do [csstats.gg](https://csstats.gg/pt-BR). React 19
+ Vite 8, alimentado só pela API do [`backend/`](../api/) (`/api`). Spec, plano e tarefas em
[`docs/frontend/`](../../docs/frontend/).

## Rodar

Precisa de Node 22.12+ (ou 20.19+) e do backend na porta 8000 (comando no [README da raiz](../../README.md)).

```sh
npm install
npm run dev       # http://localhost:5173; o Vite repassa /api para http://localhost:8000
npm run lint      # oxlint
npm run build     # gera dist/
npm run preview   # serve o dist/ (também com o proxy de /api)
```

Sem o backend, o app mostra um aviso com o comando para subi-lo e tenta de novo a cada 5 s.

## Páginas

| Rota | O que mostra |
|---|---|
| `/` | Busca, contadores, KPIs da EDA, últimas partidas, top jogadores e times |
| `/ranking`, `/ranking/times` | Ranking de jogadores (histograma da métrica, corte de rounds) e de times |
| `/partidas`, `/partidas/:id` | Lista de partidas; Placar, Rounds (barra, economia, kill feed), Heatmap e Duelos |
| `/jogadores/:puuid` | Resumo (evolução), Partidas, Agentes, Mapas, Armas e Heatmap |
| `/times/:id` | Visão geral, Elenco, Mapas (composições), Partidas, Confrontos e Heatmap |
| `/analises`, `/analises/:id` | As análises do backend, por categoria; tela cheia com "ver dados" |
| `/mapas`, `/mapas/:mapa` | Grade de mapas; explorador de heatmap, top 10 e análises do mapa |

Filtros, abas e ordenação ficam na URL: um link copiado reabre a mesma visão.

## Estrutura

```
src/
├── main.jsx        # rotas
├── App.jsx         # layout: navbar, aviso de backend fora do ar, rodapé
├── api.js          # useApi (cache por URL), buscar, juntarRespostas
├── filtros.js      # filtros comuns ⇄ query string (useFiltros, useParametro, useParametros)
├── formatos.js     # rótulos, números, cor por qualidade, datas, nicks, links e ícones
├── constants.js    # mapas, lados, cerimônias, cores de série, cortes do ranking
├── components/     # peças reutilizáveis (Tabela, Estado, MapaCalor, PainelHeatmap, BarraRounds…)
├── graficos/       # GraficoAnalise + um arquivo por grafico.tipo (barras, linha, kpi, matriz, dispersao)
└── pages/          # uma pasta por página com abas (ranking/, partida/, jogador/, time/)
public/
├── maps/           # minimapas
├── agentes/, armas/  # ícones, gerados por scripts/baixar_icones.py
```

## Estender

- **Análise nova**: um arquivo em `apps/api/app/analises/` aparece em `/analises` sem mudar o front; o gráfico
  sai pelo `grafico.tipo` (tipo desconhecido vira tabela).
- **Tipo de gráfico novo**: um arquivo em `src/graficos/` que recebe `{ dados, grafico }` e uma linha no
  objeto `GRAFICOS` de `GraficoAnalise.jsx` (spec, seção 8).
- **Ícones de um agente ou arma novos**: `.venv/bin/python apps/web/scripts/baixar_icones.py`, da raiz do repositório (pula o que já
  existe). Sem ícone, o agente aparece com as iniciais e a arma com o nome.
