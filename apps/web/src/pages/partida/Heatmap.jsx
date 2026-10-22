import { useMemo } from 'react'
import { useParams } from 'react-router'
import { juntarRespostas, useApi } from '../../api'
import { LADOS } from '../../constants'
import { useParametros } from '../../filtros'
import { formatar } from '../../formatos'
import Estado from '../../components/Estado'
import EventoAbate from '../../components/EventoAbate'
import MapaCalor from '../../components/MapaCalor'
import './Heatmap.css'

const PADROES = { tipo: 'kills', equipe: '', jogador: '', metade: '', lado: '' }

// Aba Heatmap da partida (spec 7.4 e 9): todos os abates numa chamada só, filtrados aqui. Os filtros valem
// para quem faz a ação: o killer em Kills, a vítima em Mortes. O lado vem de /rounds (plano 3.4).
function Heatmap() {
	const { id } = useParams()
	const partida = useApi(`partidas/${id}`)
	const rounds = useApi(`partidas/${id}/rounds`)
	const abates = useApi(`partidas/${id}/abates`)

	return (
		<Estado resposta={juntarRespostas(partida, rounds, abates)} vazio={() => false} esqueleto="grafico">
			{([{ partida: p, times }, lista, { mapa, abates: todos }]) => (
				<HeatmapPartida partida={p} times={times} rounds={lista} mapa={mapa} abates={todos} />
			)}
		</Estado>
	)
}

function HeatmapPartida({ partida, times, rounds, mapa, abates }) {
	const [f, setF] = useParametros(PADROES)
	const porRound = useMemo(() => new Map(rounds.map(r => [r.round, r])), [rounds])
	const metades = [...new Set(rounds.map(r => r.metade))]
	const jogadores = times.flatMap(t => t.jogadores.map(j => ({ ...j, time_id: t.id })))
		.filter(j => !f.equipe || j.time_id === f.equipe)

	const pontos = useMemo(() => {
		const kills = f.tipo === 'kills'
		return abates
			.filter(a => (kills ? a.valido && a.killer_pos : a.vitima_pos))
			.filter(a => {
				const quem = kills ? a.killer : a.vitima
				const round = porRound.get(a.round)
				const lado = round?.time_atacante_id === quem.time_id ? 'Attacker' : 'Defender'
				return (!f.equipe || quem.time_id === f.equipe)
					&& (!f.jogador || quem.puuid === f.jogador)
					&& (!f.metade || round?.metade === f.metade)
					&& (!f.lado || lado === f.lado)
			})
			.map(a => (kills ? a.killer_pos : a.vitima_pos))
	}, [abates, porRound, f.tipo, f.equipe, f.jogador, f.metade, f.lado])

	// Trocar o time limpa o jogador que não é dele.
	const escolherEquipe = valor => setF({ equipe: valor, jogador: jogadores.some(j => j.puuid === f.jogador && j.time_id === valor) ? f.jogador : '' })

	const ordenados = [...abates].sort((x, y) => x.round - y.round || x.tempo_s - y.tempo_s)

	return (
		<div className="heatmap-partida">
			<div className="heatmap-partida__mapa">
				<div className="heatmap-partida__controles">
					<div className="heatmap-partida__tipo" role="group" aria-label="Tipo">
						{[['kills', 'Kills'], ['mortes', 'Mortes']].map(([v, r]) => (
							<button key={v} className={`chip ${f.tipo === v ? 'chip--ativo' : ''}`} aria-pressed={f.tipo === v} onClick={() => setF({ tipo: v })}>{r}</button>
						))}
					</div>
					<Seletor rotulo="Time" valor={f.equipe} onChange={escolherEquipe}
						opcoes={times.map(t => [t.id, t.nome])} todos="Todos" />
					<Seletor rotulo="Jogador" valor={f.jogador} onChange={v => setF({ jogador: v })}
						opcoes={jogadores.map(j => [j.puuid, j.nick])} todos="Todos" />
					<Seletor rotulo="Metade" valor={f.metade} onChange={v => setF({ metade: v })}
						opcoes={metades.map(m => [m, m])} todos="Todas" />
					<Seletor rotulo="Lado" valor={f.lado} onChange={v => setF({ lado: v })}
						opcoes={Object.entries(LADOS).map(([v, l]) => [v, l.rotulo])} todos="Ambos" />
				</div>
				<MapaCalor mapa={mapa} pontos={pontos} />
			</div>

			<section className="card heatmap-partida__feed" aria-label="Kill feed">
				<h2>Kill feed</h2>
				<ol>
					{ordenados.map((a, i) => (
						<li key={i} className={i === 0 || ordenados[i - 1].round !== a.round ? 'heatmap-partida__novo-round' : undefined}>
							{(i === 0 || ordenados[i - 1].round !== a.round) && <span className="heatmap-partida__round muted">Round {a.round}</span>}
							<span className="muted numero heatmap-partida__tempo">{formatar('tempo_s', a.tempo_s)}</span>
							<EventoAbate a={a} partida={partida} />
						</li>
					))}
				</ol>
			</section>
		</div>
	)
}

function Seletor({ rotulo, valor, onChange, opcoes, todos }) {
	return (
		<label className="barra-filtros__campo">
			<span className="barra-filtros__rotulo">{rotulo}</span>
			<select className="barra-filtros__select" value={valor} onChange={e => onChange(e.target.value)}>
				<option value="">{todos}</option>
				{opcoes.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
			</select>
		</label>
	)
}

export default Heatmap
