import { CALIBRATION } from './constants'

export function toTitleCase(str) {
  return str
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function parseFilename(filename) {
  const stem = filename.replace(/\.json$/i, '')
  const parts = stem.split('_')

  const xIdx = parts.indexOf('x')
  if (xIdx === -1) return null

  const dateIdx = parts.findIndex(p => /^\d{2}-\d{2}-\d{2}$/.test(p))
  if (dateIdx === -1) return null

  const score1 = parseInt(parts[xIdx - 1], 10)
  const score2 = parseInt(parts[xIdx + 1], 10)
  if (isNaN(score1) || isNaN(score2)) return null

  const team1 = parts.slice(dateIdx + 1, xIdx - 1).join(' ')
  const team2 = parts.slice(xIdx + 2, parts.length - 1).join(' ')
  const map   = parts[parts.length - 1].toLowerCase()
  const date  = parts[dateIdx]

  const numRaw = parts.slice(1, dateIdx).join('_')
  const numMatch = numRaw.match(/^(.+?)([a-z])$/)
  const seriesId = numMatch ? numMatch[1] : numRaw

  const won = score1 > score2

  return {
    filename,
    team1, score1,
    team2, score2,
    map, date,
    numRaw, seriesId,
    won1: won,
    won2: !won,
    winner: won ? team1 : team2,
    loser:  won ? team2 : team1,
  }
}

export function buildTeamIndex(matches) {
  const index = {}
  for (const m of matches) {
    if (!m) continue
    for (const team of [m.team1, m.team2]) {
      if (!index[team]) index[team] = []
      index[team].push(m)
    }
  }
  return index
}

export function formatDate(raw) {
  return raw.replace(/-/g, '/')
}

export function readFileAsJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      try { resolve(JSON.parse(e.target.result)) }
      catch (err) { reject(err) }
    }
    reader.onerror = reject
    reader.readAsText(file)
  })
}

export function extractKillData(matchData, mapName) {
  const cal = CALIBRATION[mapName]
  if (!cal) return null

  const { xMin, xMax, yMin, yMax } = cal
  const xRange = xMax - xMin
  const yRange = yMax - yMin

  // TODO: orientação do eixo Y pode estar invertida dependendo do mapa.
  // Se os pontos aparecerem espelhados verticalmente na imagem, trocar:
  //   ny = 1 - (y - yMin) / yRange
  const norm = (x, y) => ({
    nx: Math.max(0, Math.min(1, (x - xMin) / xRange)),
    ny: Math.max(0, Math.min(1, (y - yMin) / yRange)),
  })

  // puuid → { name, teamId }
  const playerMap = {}
  for (const p of matchData.players || []) {
    playerMap[p.puuid] = {
      name: p.gameName,
      fullName: `${p.gameName}#${p.tagLine}`,
      teamId: p.teamId,
    }
  }

  const kills = []

  for (const round of matchData.roundResults || []) {
    for (const ps of round.playerStats || []) {
      for (const kill of ps.kills || []) {
        const { killer, victim, victimLocation, playerLocations } = kill

        const vNorm = norm(victimLocation.x, victimLocation.y)

        // killer's position at moment of kill from the snapshot
        const killerEntry = (playerLocations || []).find(pl => pl.puuid === killer)
        const kNorm = killerEntry ? norm(killerEntry.location.x, killerEntry.location.y) : null

        kills.push({
          victimNx: vNorm.nx,
          victimNy: vNorm.ny,
          killerNx: kNorm?.nx ?? null,
          killerNy: kNorm?.ny ?? null,
          victimPuuid: victim,
          killerPuuid: killer,
          roundNum: round.roundNum,
        })
      }
    }
  }

  return { kills, playerMap }
}
