import { useState } from 'react'
import DropZone from './DropZone'
import { toTitleCase } from '../utils'

function Sidebar({ teamIndex, fileCount, selectedTeam, onSelectTeam, onFiles }) {
  const [search, setSearch] = useState('')

  const teams = Object.keys(teamIndex)
    .filter(t => t.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const winsA = teamIndex[a].filter(m => m.winner === a).length
      const winsB = teamIndex[b].filter(m => m.winner === b).length
      return winsB - winsA
    })

  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <span className="sidebar__logo">VAVA</span>
        <span className="sidebar__subtitle">Match Explorer</span>
      </div>

      <DropZone onFiles={onFiles} compact={fileCount > 0} />

      {fileCount > 0 && (
        <p className="sidebar__filecount">{fileCount} arquivo{fileCount !== 1 ? 's' : ''} carregado{fileCount !== 1 ? 's' : ''}</p>
      )}

      {teams.length > 0 && (
        <>
          <input
            className="sidebar__search"
            type="text"
            placeholder="Buscar time..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <ul className="sidebar__list">
            {teams.map(team => {
              const matches = teamIndex[team]
              const wins = matches.filter(m => m.winner === team).length
              const losses = matches.length - wins
              return (
                <li key={team}>
                  <button
                    className={`sidebar__team ${selectedTeam === team ? 'sidebar__team--active' : ''}`}
                    onClick={() => onSelectTeam(team)}
                  >
                    <span className="sidebar__team-name">{toTitleCase(team)}</span>
                    <span className="sidebar__team-record">
                      <span className="record-win">{wins}W</span>
                      <span className="record-sep"> / </span>
                      <span className="record-loss">{losses}L</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </aside>
  )
}

export default Sidebar
