import { CATEGORIAS_MEIO, CERIMONIAS, LADOS } from './constants'

// Dado da API → texto, cor ou link (spec 5.4). A API devolve snake_case e floats com 2 casas;
// o front só formata, nunca recalcula.

export const ROTULOS = {
  // ranking e placar
  posicao: "#", nick: "Jogador", time: "Time", nome: "Time", adversario: "Adversário",
  agente: "Agente", agente_principal: "Agente", funcao: "Função", funcao_principal: "Função",
  partidas: "Partidas", vitorias: "Vitórias", derrotas: "Derrotas", win_pct: "Win%", rounds: "Rounds",
  kills: "K", deaths: "D", assists: "A", mais_menos: "+/−", acs: "ACS", adr: "ADR", kd: "K/D",
  kast_pct: "KAST", hs_pct: "HS%", kpr: "KPR", dpr: "DPR", apr: "APR", fk_round: "FK/R", fd_round: "FD/R",
  first_kills: "FK", first_deaths: "FD", multikills: "MK", posicao_ranking: "Ranking",
  // times
  rounds_ganhos: "Rounds ganhos", rounds_perdidos: "Rounds perdidos", saldo_rounds: "Saldo",
  atk_win_pct: "Win% ATK", def_win_pct: "Win% DEF", pistol_win_pct: "Win% pistol",
  atk_rounds: "Rounds ATK", def_rounds: "Rounds DEF", pistols: "Pistols", agentes: "Composição", compra: "Compra",
  // partidas, rounds e abates
  data: "Data", torneio: "Torneio", fase: "Fase", codigo: "Jogo", mapa: "Mapa", duracao_min: "Duração",
  n_rounds: "Rounds", placar_time: "Placar", placar_adversario: "Placar adv.", venceu: "Resultado",
  round: "Round", metade: "Metade", resultado: "Resultado", ceremonia: "Cerimônia", lado_vencedor: "Lado vencedor",
  houve_plant: "Plant", plant_site: "Site", houve_defuse: "Defuse", compra_atk: "Compra ATK", compra_def: "Compra DEF",
  loadout_atk: "Loadout ATK", loadout_def: "Loadout DEF", tempo_s: "Tempo", meio: "Arma", categoria_meio: "Categoria",
  assistencias: "Assist.", pct: "%",
  // análises e distribuição
  escolhas: "Escolhas", pick_rate: "Pick rate", partidas_mapa: "Partidas no mapa", pct_do_mapa: "% do mapa",
  plants: "Plants", faixa: "Faixa", vantagem_media: "Vantagem média", conversao_pct: "Conversão",
  quem_abriu: "Quem abriu", win_pct_quem_abriu: "Win% de quem abriu", metrica: "Métrica", r: "Correlação (r)",
  media_vitoria: "Média na vitória", media_derrota: "Média na derrota", inicio: "De", fim: "Até",
  jogadores: "Jogadores", pct_acumulado: "% acumulado", total: "Total",
  // habilidades
  situacao_habilidade: "Situação do abate por habilidade", fase_impacto: "Fase do abate por habilidade",
  team_rounds: "Rounds da equipe", team_matches: "Partidas-equipe",
  jogador_partidas: "Jogador-partidas (n)", jogadores_considerados: "Jogadores considerados",
  faixa_casts: "Casts por round",
  faixa_atividade: "Faixa de casts",
  casts_total: "Casts totais", casts_por_round: "Casts / jogador-round",
  casts_por_equipe_round: "Casts por equipe-round", grenade_casts: "Granadas",
  grenade_casts_round: "Granadas por round", ability1_casts_round: "Habilidade 1 por round",
  ability2_casts_round: "Habilidade 2 por round", ultimate_casts_round: "Ultimates por round",
  loadout_medio: "Equipamento médio (créditos/round)", abates_habilidade: "Abates por habilidade",
  rounds_equipe: "Rounds da equipe",
}

// Coluna sem rótulo vira texto legível: "nova_coluna" → "Nova coluna".
export function rotulo(coluna) {
  if (ROTULOS[coluna]) return ROTULOS[coluna]
  const texto = String(coluna).replaceAll('_', ' ')
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

// --- Números ---------------------------------------------------------------------------------

// Uma instância por formato (plano, seção 2).
const NF = {
  inteiro: new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }),
  uma:     new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
  duas:    new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  livre:   new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }),
}

// Sinal de menos tipográfico (−) no lugar do hífen.
const comMenos = texto => texto.replace('-', '−')
const numero = (fmt, v) => comMenos(NF[fmt].format(v))

const INTEIRO = new Set(['acs', 'adr', 'inicio', 'fim', 'loadout_atk', 'loadout_def', 'vantagem_media'])
const DUAS_CASAS = new Set(['kd', 'kpr', 'dpr', 'apr', 'fk_round', 'fd_round', 'r'])
const UMA_CASA = new Set(['media_vitoria', 'media_derrota'])
const COM_SINAL = new Set(['mais_menos', 'saldo_rounds'])

const ehPercentual = coluna => coluna === 'pick_rate' || String(coluna).split('_').includes('pct')

// Texto de exibição por nome de coluna. Valor ausente → "—".
export function formatar(coluna, valor) {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '—'

  switch (coluna) {
    case 'data': return formatarData(valor)
    case 'venceu': return valor ? 'V' : 'D'
    case 'lado_vencedor':
    case 'lado': return LADOS[valor]?.rotulo ?? valor
    case 'ceremonia': return CERIMONIAS[valor] ?? ''
    case 'categoria_meio': return CATEGORIAS_MEIO[valor] ?? valor
    case 'metrica': return rotulo(valor)
    case 'duracao_min': return `${Math.round(valor)} min`
    case 'tempo_s': {
      const s = Math.floor(valor)
      return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
    }
  }

  if (typeof valor === 'boolean') return valor ? 'Sim' : 'Não'
  if (typeof valor !== 'number') return String(valor)

  if (ehPercentual(coluna)) return `${numero('uma', valor)}%`
  if (COM_SINAL.has(coluna)) return valor > 0 ? `+${numero('inteiro', valor)}` : numero('inteiro', valor)
  if (INTEIRO.has(coluna)) return numero('inteiro', valor)
  if (DUAS_CASAS.has(coluna)) return numero('duas', valor)
  if (UMA_CASA.has(coluna)) return numero('uma', valor)
  return numero(Number.isInteger(valor) ? 'inteiro' : 'livre', valor)
}

// "1 partida", "12 partidas", "1.049 plants".
export function contagem(n, singular, plural = `${singular}s`) {
  return `${numero('inteiro', n)} ${n === 1 ? singular : plural}`
}

// --- Cor por qualidade -----------------------------------------------------------------------

// 1º e 3º quartis dos 222 jogadores do ranking (100+ rounds, 21/10/2026): [ruim ≤, bom ≥] (spec 6.3, F16).
const LIMIARES = {
  acs: [177, 222],
  adr: [118, 148],
  kd: [0.84, 1.15],
  kast_pct: [67.6, 75.1],
  hs_pct: [22.2, 29.4],
  fk_round: [0.06, 0.13],
  win_pct: [45, 55],
  atk_win_pct: [45, 55],
  def_win_pct: [45, 55],
  pistol_win_pct: [45, 55],
}

// "bom" | "ruim" | null. A cor é só uma pista: o número está sempre escrito.
export function corQualidade(coluna, valor) {
  if (typeof valor !== 'number' || Number.isNaN(valor)) return null
  if (COM_SINAL.has(coluna)) return valor > 0 ? 'bom' : valor < 0 ? 'ruim' : null
  const limiar = LIMIARES[coluna]
  if (!limiar) return null
  if (valor <= limiar[0]) return 'ruim'
  if (valor >= limiar[1]) return 'bom'
  return null
}

// --- Datas e nicks ---------------------------------------------------------------------------

// "2026-09-27" → "27/09/2026" ("27/09" com curta). Corta a string: new Date("2026-09-27") é
// meia-noite UTC e, em UTC−3, viraria 26/09 (plano, seção 2).
export function formatarData(iso, { curta = false } = {}) {
  const [a, m, d] = String(iso).slice(0, 10).split('-')
  return curta ? `${d}/${m}` : `${d}/${m}/${a}`
}

// "gubert 水#SEP" → { nome: "gubert 水", tag: "SEP" }. O último # separa a tag.
export function dividirNick(nick) {
  const texto = String(nick ?? '')
  const i = texto.lastIndexOf('#')
  return i < 0 ? { nome: texto, tag: '' } : { nome: texto.slice(0, i), tag: texto.slice(i + 1) }
}

// --- Ícones ---------------------------------------------------------------------------------

// Mesmo nome de arquivo de scripts/baixar_icones.py: minúsculas, sem acentos nem símbolos ("KAY/O" → "kayo.png").
export function arquivoIcone(nome) {
  return String(nome ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '') + '.png'
}
export const iconeAgente = nome => `/agentes/${arquivoIcone(nome)}`
export const iconeArma = meio => `/armas/${arquivoIcone(meio)}`

// --- Links e equipes -------------------------------------------------------------------------

export const linkJogador = puuid => `/jogadores/${encodeURIComponent(puuid)}`
export const linkPartida = id => `/partidas/${encodeURIComponent(id)}`
export const linkAnalise = id => `/analises/${encodeURIComponent(id)}`
export const linkMapa = mapa => `/mapas/${encodeURIComponent(mapa)}`
export const linkTime = id => `/times/${encodeURIComponent(id)}`

// "a" | "b" | null: qual equipe da partida é o time. Escolhe --time-a/--time-b; não é o lado (F12).
export function equipe(partida, timeId) {
  if (partida?.time_a?.id === timeId) return 'a'
  if (partida?.time_b?.id === timeId) return 'b'
  return null
}
