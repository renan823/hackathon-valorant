import { useState, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import MatchCard from './components/MatchCard'
import HeatmapView from './components/HeatmapView'
import { parseFilename, buildTeamIndex, toTitleCase, readFileAsJSON } from './utils'
import './App.css'

function App() {
  const [teamIndex, setTeamIndex]     = useState({})
  const [matchDataMap, setMatchDataMap] = useState({}) // filename → parsed JSON
  const [fileCount, setFileCount]     = useState(0)
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [selectedMatch, setSelectedMatch] = useState(null) // { meta, data }

  const handleFiles = useCallback(async (files) => {
    const results = await Promise.all(
      files.map(async (f) => {
        const meta = parseFilename(f.name)
        if (!meta) return null
        try {
          const data = await readFileAsJSON(f)
          return { meta, data }
        } catch {
          return { meta, data: null }
        }
      })
    )

    setFileCount(prev => prev + files.length)

    setMatchDataMap(prev => {
      const next = { ...prev }
      for (const r of results) {
        if (r?.meta) next[r.meta.filename] = r.data
      }
      return next
    })

    setTeamIndex(prev => {
      const merged = { ...prev }
      for (const r of results) {
        if (!r?.meta) continue
        const m = r.meta
        for (const team of [m.team1, m.team2]) {
          if (!merged[team]) merged[team] = []
          if (!merged[team].find(x => x.filename === m.filename)) {
            merged[team] = [...merged[team], m]
          }
        }
      }
      return merged
    })
  }, [])

  // If a match is open, show heatmap view
  if (selectedMatch) {
    return (
      <HeatmapView
        meta={selectedMatch.meta}
        matchData={selectedMatch.data}
        onBack={() => setSelectedMatch(null)}
      />
    )
  }

  const matches = selectedTeam ? teamIndex[selectedTeam] ?? [] : []
  const wins   = matches.filter(m => m.winner === selectedTeam).length
  const losses = matches.length - wins

  return (
    <div className="layout">
      <Sidebar
        teamIndex={teamIndex}
        fileCount={fileCount}
        selectedTeam={selectedTeam}
        onSelectTeam={setSelectedTeam}
        onFiles={handleFiles}
      />

      <main className="main">
        {!selectedTeam ? (
          <div className="main__empty">
            {Object.keys(teamIndex).length === 0 ? (
              <>
                <p className="main__empty-title">Carregue os arquivos de partida</p>
                <p className="main__empty-sub">Arraste os <code>.json</code> na sidebar para começar</p>
              </>
            ) : (
              <>
                <p className="main__empty-title">Selecione um time</p>
                <p className="main__empty-sub">{Object.keys(teamIndex).length} times encontrados</p>
              </>
            )}
          </div>
        ) : (
          <>
            <header className="main__header">
              <h1 className="main__team-name">{toTitleCase(selectedTeam)}</h1>
              <div className="main__record">
                <span className="record-win">{wins}W</span>
                <span className="record-sep"> / </span>
                <span className="record-loss">{losses}L</span>
                <span className="main__record-total"> · {matches.length} partida{matches.length !== 1 ? 's' : ''}</span>
              </div>
            </header>
            <div className="match-grid">
              {matches
                .slice()
                .sort((a, b) => b.date.localeCompare(a.date))
                .map(m => (
                  <MatchCard
                    key={m.filename}
                    match={m}
                    teamName={selectedTeam}
                    onClick={() => setSelectedMatch({ meta: m, data: matchDataMap[m.filename] })}
                  />
                ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default App
