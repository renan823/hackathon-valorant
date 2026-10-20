import { useState, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import MatchCard from './components/MatchCard'
import HeatmapView from './components/HeatmapView'
import MatchGraph from './components/MatchGraph' // <-- 1. Importação do Grafo
import { parseFilename, buildTeamIndex, toTitleCase, readFileAsJSON } from './utils'
import './App.css'

function App() {
	const [teamIndex, setTeamIndex] = useState({})
	const [matchDataMap, setMatchDataMap] = useState({}) // filename → parsed JSON
	const [fileCount, setFileCount] = useState(0)
	const [selectedTeam, setSelectedTeam] = useState(null)
	const [selectedMatch, setSelectedMatch] = useState(null) // { meta, data }

	// <-- 2. Novo estado para alternar entre Heatmap e Grafo
	const [matchView, setMatchView] = useState('heatmap')

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

	// <-- 3. Nova estrutura quando uma partida é selecionada
	if (selectedMatch) {
		return (
			<div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
				{/* Barra de Controles da Partida */}
				<div style={{ padding: '1rem', backgroundColor: '#1a1a1a', borderBottom: '1px solid #333', display: 'flex', gap: '1rem', alignItems: 'center' }}>
					<button
						onClick={() => {
							setSelectedMatch(null)
							setMatchView('heatmap') // Reseta a view ao fechar
						}}
						style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}
					>
						← Voltar
					</button>

					<div style={{ width: '1px', height: '24px', backgroundColor: '#444', margin: '0 0.5rem' }}></div>

					<button
						onClick={() => setMatchView('heatmap')}
						style={{
							padding: '0.5rem 1rem',
							cursor: 'pointer',
							backgroundColor: matchView === 'heatmap' ? '#3b82f6' : 'transparent',
							color: matchView === 'heatmap' ? '#fff' : '#ccc',
							border: '1px solid #3b82f6',
							borderRadius: '4px'
						}}
					>
						Heatmap
					</button>

					<button
						onClick={() => setMatchView('graph')}
						style={{
							padding: '0.5rem 1rem',
							cursor: 'pointer',
							backgroundColor: matchView === 'graph' ? '#3b82f6' : 'transparent',
							color: matchView === 'graph' ? '#fff' : '#ccc',
							border: '1px solid #3b82f6',
							borderRadius: '4px'
						}}
					>
						Grafo de Embates
					</button>
				</div>

				{/* Área de Visualização Principal */}
				<div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
					{matchView === 'heatmap' ? (
						<HeatmapView
							meta={selectedMatch.meta}
							matchData={selectedMatch.data}
							onBack={() => setSelectedMatch(null)}
						/>
					) : (
						<MatchGraph matchData={selectedMatch.data} />
					)}
				</div>
			</div>
		)
	}

	const matches = selectedTeam ? teamIndex[selectedTeam] ?? [] : []
	const wins = matches.filter(m => m.winner === selectedTeam).length
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
