import { useEffect, useMemo, useRef, useState } from 'react'
import { MAP_IMAGES } from '../constants'
import { cor } from '../graficos/comum'
import HeatmapCanvas from './HeatmapCanvas'
import './MapaCalor.css'
import './ModalDuelo.css'

const VB = 1024

const getId = (n) => (n && typeof n === 'object' ? n.id : n)

function ModalDuelo({ aresta, todosAbates, mapa, partida, nos, onFechar }) {
	const dialogRef = useRef(null)
	const [showHeat, setShowHeat] = useState(true)
	const [showSetas, setShowSetas] = useState(true)
	const [hovered, setHovered] = useState(null)

	useEffect(() => {
		const d = dialogRef.current
		if (!d) return
		d.showModal()
		const onCancel = (e) => { e.preventDefault(); onFechar() }
		d.addEventListener('cancel', onCancel)
		return () => d.removeEventListener('cancel', onCancel)
	}, [onFechar])

	const idA = getId(aresta?.source)
	const idB = getId(aresta?.target)

	const porId = useMemo(
		() => Object.fromEntries((nos || []).map(n => [n.id, n])),
		[nos]
	)
	const jogadorA = porId[idA]
	const jogadorB = porId[idB]

	// Lê cores computadas uma vez: CSS vars não funcionam em atributos fill/stroke de SVG.
	const cores = useMemo(() => ({
		[partida.time_a.id]: cor('--time-a'),
		[partida.time_b.id]: cor('--time-b'),
	}), [partida.time_a.id, partida.time_b.id])

	const embates = useMemo(() => {
		if (!todosAbates) return []
		return todosAbates.filter(a =>
			(a.killer.puuid === idA && a.vitima.puuid === idB) ||
			(a.killer.puuid === idB && a.vitima.puuid === idA)
		)
	}, [todosAbates, idA, idB])

	const pontos = useMemo(() => {
		const pts = []
		for (const a of embates) {
			if (a.killer_pos) pts.push(a.killer_pos)
			if (a.vitima_pos) pts.push(a.vitima_pos)
		}
		return pts
	}, [embates])

	const mapaImg = MAP_IMAGES[String(mapa).toLowerCase()]
	const killsA = aresta?.killsOrigem ?? 0
	const killsB = aresta?.killsDestino ?? 0

	// Fechar ao clicar no backdrop (o <dialog> em si, fora do __conteudo).
	const handleClick = (e) => { if (e.target === e.currentTarget) onFechar() }

	return (
		<dialog ref={dialogRef} className="modal-duelo" onClick={handleClick}>
			<div className="modal-duelo__conteudo">
				<header className="modal-duelo__cabecalho">
					<h2 className="modal-duelo__titulo">
						<span style={{ color: cores[jogadorA?.time_id] }}>{jogadorA?.nick}</span>
						<strong className="numero">{killsA} × {killsB}</strong>
						<span style={{ color: cores[jogadorB?.time_id] }}>{jogadorB?.nick}</span>
					</h2>
					<button type="button" className="modal-duelo__fechar" aria-label="Fechar" onClick={onFechar}>
						✕
					</button>
				</header>

				<p className="muted modal-duelo__descricao">
					{String(mapa)} — seta parte de quem matou e aponta para onde a vítima morreu.
				</p>

				<div className="modal-duelo__corpo">
					<div className="modal-duelo__mapa">
						{mapaImg && (
							<img
								className="mapa-calor__imagem"
								src={mapaImg}
								alt={`Minimapa de ${mapa}`}
								draggable={false}
							/>
						)}
						{showHeat && <HeatmapCanvas pontos={pontos} />}
						{showSetas && (
							<svg
								className="modal-duelo__setas"
								viewBox={`0 0 ${VB} ${VB}`}
								aria-hidden="true"
							>
								<defs>
									{Object.entries(cores).map(([timeId, color]) => (
										<marker
											key={timeId}
											id={`modal-seta-${timeId}`}
											viewBox="0 0 10 10"
											refX="9" refY="5"
											markerWidth="18" markerHeight="18"
											markerUnits="userSpaceOnUse"
											orient="auto"
										>
											<path d="M0,0 L10,5 L0,10 z" fill={color} stroke="#000" strokeWidth="1" />
										</marker>
									))}
								</defs>
								{embates.map((a, i) => {
									if (!a.vitima_pos) return null
									const dim = hovered !== null && hovered !== i
									const cor = cores[a.killer.time_id]
									const vx = a.vitima_pos.x * VB, vy = a.vitima_pos.y * VB
									return (
										<g key={i} opacity={dim ? 0.15 : 1}>
											{a.killer_pos && (
												<>
													<line
														x1={a.killer_pos.x * VB} y1={a.killer_pos.y * VB}
														x2={vx} y2={vy}
														stroke="#000" strokeOpacity="0.7" strokeWidth="8" strokeLinecap="round"
													/>
													<line
														x1={a.killer_pos.x * VB} y1={a.killer_pos.y * VB}
														x2={vx} y2={vy}
														stroke={cor} strokeWidth="4" strokeLinecap="round"
														markerEnd={`url(#modal-seta-${a.killer.time_id})`}
													/>
													<circle
														cx={a.killer_pos.x * VB} cy={a.killer_pos.y * VB}
														r="8" fill={cor} stroke="#000" strokeWidth="2"
													/>
												</>
											)}
											<circle cx={vx} cy={vy} r="10" fill="none" stroke="#fff" strokeWidth="2.5" />
										</g>
									)
								})}
							</svg>
						)}
					</div>

					<div className="modal-duelo__painel">
						<div role="group" aria-label="Camadas" className="modal-duelo__chips">
							<button
								type="button"
								className={`chip ${showHeat ? 'chip--ativo' : ''}`}
								onClick={() => setShowHeat(v => !v)}
							>
								Heatmap
							</button>
							<button
								type="button"
								className={`chip ${showSetas ? 'chip--ativo' : ''}`}
								onClick={() => setShowSetas(v => !v)}
							>
								Setas
							</button>
						</div>

						<ul className="modal-duelo__lista">
							{embates.length === 0 && (
								<li className="muted">Sem embates registados.</li>
							)}
							{embates.map((a, i) => (
								<li
									key={i}
									className="modal-duelo__item"
									onMouseEnter={() => setHovered(i)}
									onMouseLeave={() => setHovered(null)}
								>
									<span className="modal-duelo__dot" style={{ background: cores[a.killer.time_id] }} />
									<span className="modal-duelo__kill">
										<strong>{a.killer.nick}</strong>
										<span className="muted"> → </span>
										{a.vitima.nick}
									</span>
								</li>
							))}
						</ul>

						<p className="muted modal-duelo__legenda-seta">
							Círculo cheio = posição de quem matou · círculo vazio = local da morte
						</p>
					</div>
				</div>
			</div>
		</dialog>
	)
}

export default ModalDuelo
