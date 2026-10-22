import { Bomb, Shield, Skull, Swords, Timer, Wrench } from 'lucide-react'

// Minimapas em public/maps/, pelo nome do mapa em minúsculas.
export const MAP_IMAGES = {
  ascent:   '/maps/ascent.png',
  haven:    '/maps/haven.png',
  split:    '/maps/split.png',
  lotus:    '/maps/lotus.png',
  pearl:    '/maps/pearl.png',
  breeze:   '/maps/breeze.png',
  fracture: '/maps/fracture.png',
  bind:     '/maps/bind.png',
  icebox:   '/maps/icebox.png',
  sunset:   '/maps/sunset.png',
  abyss:    '/maps/abyss.png',
  summit:   '/maps/summit.png',
}

// `resultado` do round → ícone e rótulo (spec 5.4).
export const RESULTADOS = {
  'Eliminated':          { Icone: Skull,  rotulo: 'Eliminação' },
  'Bomb defused':        { Icone: Wrench, rotulo: 'Spike desarmada' },
  'Bomb detonated':      { Icone: Bomb,   rotulo: 'Spike explodiu' },
  'Round timer expired': { Icone: Timer,  rotulo: 'Tempo esgotado' },
}

// `ceremonia` → selo; CeremonyDefault não mostra nada.
export const CERIMONIAS = {
  CeremonyAce:      'Ace',
  CeremonyTeamAce:  'Team Ace',
  CeremonyClutch:   'Clutch',
  CeremonyFlawless: 'Flawless',
  CeremonyThrifty:  'Thrifty',
  CeremonyCloser:   'Closer',
}

// Lado do round. Na Partida, o lado é texto ou ícone, nunca cor (F12).
export const LADOS = {
  Attacker: { rotulo: 'Ataque', curto: 'ATK', noLado: 'no ataque', Icone: Swords },
  Defender: { rotulo: 'Defesa', curto: 'DEF', noLado: 'na defesa', Icone: Shield },
}

// `categoria_meio` que aparece no kill feed com nome próprio; as demais ficam como vêm.
export const CATEGORIAS_MEIO = {
  Bomb:  'Spike',
  Fall:  'Queda',
  Crush: 'Esmagado',
}

// Abas da página Análises; categoria nova sem rótulo aparece com a primeira letra maiúscula.
export const CATEGORIAS = {
  mapas:     'Mapas',
  momentos:  'Momentos decisivos',
  economia:  'Economia',
  meta:      'Meta',
  jogadores: 'Jogadores',
}

// Valor → slot de --serie-N, fixo: um filtro que some com uma série não repinta as outras (F13).
// Valor fora daqui vai para "Outros".
export const CORES_SERIE = {
  Rifle:   1,
  Sidearm: 2,
  Sniper:  3,
}

// Corte padrão do ranking de jogadores; espelha MIN_ROUNDS_PADRAO do backend (F1).
export const MIN_ROUNDS_PADRAO = 100
// Corte padrão do ranking de times, o mesmo da Home e da EDA. O padrão da API é 0, então o front envia (F1).
export const MIN_PARTIDAS_PADRAO = 8

// Heatmap: rampa de um tom (laranja), do menos para o mais denso (F14).
export const RAMPA_CALOR = ['#a93900', '#d1521d', '#f57242', '#ffa383', '#fed3c4']
