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

export const MAP_NAMES = {
  ascent: 'Ascent', haven: 'Haven', split: 'Split', lotus: 'Lotus',
  pearl: 'Pearl', breeze: 'Breeze', fracture: 'Fracture', bind: 'Bind',
  icebox: 'Icebox', sunset: 'Sunset', abyss: 'Abyss', summit: 'Summit',
}

// Empirical bounds (p1-p99 from all match data + 8% padding)
// xMin/xMax = west/east game units; yMin = north (most negative), yMax = south
export const CALIBRATION = {
  abyss:    { xMin: -6862, xMax: 6743,  yMin: -4838,  yMax: 5155  },
  ascent:   { xMin: -5428, xMax: 7860,  yMin: -10118, yMax: -1398 },
  breeze:   { xMin: 142,   xMax: 10611, yMin: -6970,  yMax: 7966  },
  fracture: { xMin: 2908,  xMax: 14109, yMin: -7459,  yMax: 5454  },
  haven:    { xMin: -4340, xMax: 8106,  yMin: -12000, yMax: -3639 },
  lotus:    { xMin: 921,   xMax: 10369, yMin: -6370,  yMax: 7435  },
  pearl:    { xMin: 1195,  xMax: 10048, yMin: -6481,  yMax: 7200  },
  split:    { xMin: -4300, xMax: 9055,  yMin: -9321,  yMax: -1392 },
  summit:   { xMin: 3089,  xMax: 11349, yMin: -910,   yMax: 13213 },
  sunset:   { xMin: -3046, xMax: 5028,  yMin: -6592,  yMax: 6693  },
}
