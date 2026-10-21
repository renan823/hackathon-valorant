import { useMemo, useRef, useState } from 'react'
import HeatmapCanvas from './HeatmapCanvas'
import { extractKillData } from '../utils'
import { MAP_IMAGES, MAP_NAMES } from '../constants'

const MODES = [
  { id: 'victim', label: 'Mortes' },
  { id: 'killer', label: 'Kills' },
]

function HeatmapView({ meta, matchData, onBack }) {
  const mapRef = useRef(null)
  const [mode, setMode]         = useState('victim')
  const [filterTeam, setFilterTeam] = useState('all')
  const [filterPuuid, setFilterPuuid] = useState('all')

  const killData = useMemo(
    () => extractKillData(matchData, meta.map),
    [matchData, meta.map]
  )

  // Build team lists from players
  const teams = useMemo(() => {
    if (!killData) return {}
    const t = {}
    for (const [puuid, p] of Object.entries(killData.playerMap)) {
      if (!t[p.teamId]) t[p.teamId] = []
      t[p.teamId].push({ puuid, ...p })
    }
    // sort by name within each team
    for (const id of Object.keys(t)) t[id].sort((a, b) => a.name.localeCompare(b.name))
    return t
  }, [killData])

  const teamIds = Object.keys(teams)

  // Reset player filter when team changes
  const handleTeamChange = (tid) => {
    setFilterTeam(tid)
    setFilterPuuid('all')
  }

  const playersInView = filterTeam === 'all'
    ? teamIds.flatMap(tid => teams[tid] || [])
    : (teams[filterTeam] || [])

  // Compute the points to render
  const points = useMemo(() => {
    if (!killData) return []
    const { kills } = killData

    return kills
      .filter(k => {
        if (mode === 'killer' && !k.valid) return false
        const targetPuuid = mode === 'victim' ? k.victimPuuid : k.killerPuuid
        if (filterTeam !== 'all') {
          const p = killData.playerMap[targetPuuid]
          if (!p || p.teamId !== filterTeam) return false
        }
        if (filterPuuid !== 'all' && targetPuuid !== filterPuuid) return false
        return true
      })
      .map(k => mode === 'victim'
        ? [k.victimNx, k.victimNy]
        : k.killerNx !== null ? [k.killerNx, k.killerNy] : null
      )
      .filter(Boolean)
  }, [killData, mode, filterTeam, filterPuuid])

  const mapImg  = MAP_IMAGES[meta.map]
  const mapName = MAP_NAMES[meta.map] || meta.map

  if (!killData) {
    return (
      <div className="heatmap-view">
        <button className="heatmap-back" onClick={onBack}>← Voltar</button>
        <p style={{ padding: 24, color: 'var(--text-muted)' }}>
          Calibração não disponível para o mapa "{meta.map}".
        </p>
      </div>
    )
  }

  return (
    <div className="heatmap-view">
      {/* Header */}
      <div className="heatmap-header">
        <button className="heatmap-back" onClick={onBack}>← Voltar</button>
        <div className="heatmap-header__info">
          <span className="heatmap-header__map">{mapName}</span>
          <span className="heatmap-header__match">
            {meta.team1} <strong>{meta.score1}–{meta.score2}</strong> {meta.team2}
          </span>
          <span className="heatmap-header__date">{meta.date.replace(/-/g, '/')}</span>
        </div>
        <span className="heatmap-header__count">{points.length} eventos</span>
      </div>

      <div className="heatmap-body">
        {/* Controls sidebar */}
        <div className="heatmap-controls">
          <div className="ctrl-group">
            <p className="ctrl-label">Modo</p>
            <div className="ctrl-pills">
              {MODES.map(m => (
                <button
                  key={m.id}
                  className={`ctrl-pill ${mode === m.id ? 'ctrl-pill--active' : ''}`}
                  onClick={() => setMode(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="ctrl-group">
            <p className="ctrl-label">Time</p>
            <div className="ctrl-pills">
              <button
                className={`ctrl-pill ${filterTeam === 'all' ? 'ctrl-pill--active' : ''}`}
                onClick={() => handleTeamChange('all')}
              >
                Todos
              </button>
              {teamIds.map(tid => (
                <button
                  key={tid}
                  className={`ctrl-pill ctrl-pill--${tid.toLowerCase()} ${filterTeam === tid ? 'ctrl-pill--active' : ''}`}
                  onClick={() => handleTeamChange(tid)}
                >
                  {tid}
                </button>
              ))}
            </div>
          </div>

          <div className="ctrl-group ctrl-group--players">
            <p className="ctrl-label">Jogador</p>
            <ul className="ctrl-player-list">
              <li>
                <button
                  className={`ctrl-player ${filterPuuid === 'all' ? 'ctrl-player--active' : ''}`}
                  onClick={() => setFilterPuuid('all')}
                >
                  Todos os jogadores
                </button>
              </li>
              {playersInView.map(p => (
                <li key={p.puuid}>
                  <button
                    className={`ctrl-player ${filterPuuid === p.puuid ? 'ctrl-player--active' : ''}`}
                    onClick={() => setFilterPuuid(p.puuid)}
                  >
                    <span
                      className={`ctrl-player__dot ctrl-player__dot--${p.teamId?.toLowerCase()}`}
                    />
                    {p.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Map + heatmap canvas */}
        <div className="heatmap-map-outer">
          <div className="heatmap-map-wrap" ref={mapRef}>
            {mapImg && (
              <img
                className="heatmap-map-img"
                src={mapImg}
                alt={mapName}
                draggable={false}
              />
            )}
            <HeatmapCanvas points={points} containerRef={mapRef} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default HeatmapView
