import { useState } from 'react'
import { useParams } from 'react-router'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { juntarRespostas, useApi } from '../../api'
import { CERIMONIAS, LADOS, RESULTADOS } from '../../constants'
import { formatar } from '../../formatos'
import { cor, cursor, eixo, grade } from '../../graficos/comum'
import BarraRounds from '../../components/BarraRounds'
import Estado from '../../components/Estado'
import EventoAbate, { Marcador } from '../../components/EventoAbate'
import Nick from '../../components/Nick'
import '../../graficos/graficos.css'
import './Rounds.css'

// Aba Rounds (spec 7.4): barra completa, detalhe e kill feed do round escolhido, e a economia por round.
// O round escolhido é estado local (UI efêmera, plano 2). Os abates vêm numa chamada só e são filtrados aqui.
function Rounds() {
	const { id } = useParams()
	const partida = useApi(`partidas/${id}`)
	const rounds = useApi(`partidas/${id}/rounds`)
	const abates = useApi(`partidas/${id}/abates`)
	const [selecionado, setSelecionado] = useState(1)

	return (
		<Estado resposta={juntarRespostas(partida, rounds, abates)} vazio={() => false} esqueleto="grafico">
			{([{ partida: p }, lista, { abates: todos }]) => {
				const round = lista.find(r => r.round === selecionado) ?? lista[0]
				return (
					<div className="rounds">
						<section className="card">
							<BarraRounds rounds={lista} partida={p} selecionado={round.round} onSelecionar={setSelecionado} />
						</section>
						<div className="rounds__detalhe">
							<DetalheRound r={round} partida={p} />
							<KillFeed abates={todos.filter(a => a.round === round.round)} partida={p} />
						</div>
						<Economia rounds={lista} partida={p} selecionado={round.round} />
					</div>
				)
			}}
		</Estado>
	)
}

function nomeDoTime(partida, timeId) {
	return partida.time_a.id === timeId ? partida.time_a.nome : partida.time_b.nome
}

function DetalheRound({ r, partida }) {
	const resultado = RESULTADOS[r.resultado]
	const Icone = resultado?.Icone
	const lados = [
		{ lado: 'Attacker', time: r.time_atacante_id, compra: r.compra_atk, loadout: r.loadout_atk },
		{ lado: 'Defender', time: r.time_defensor_id, compra: r.compra_def, loadout: r.loadout_def },
	]

	return (
		<section className="card rounds__card">
			<h2>Round {r.round} <span className="muted">· {r.metade}{r.pistol ? ' · pistol' : ''}</span></h2>
			<p className="rounds__vencedor">
				<Marcador partida={partida} timeId={r.vencedor_id} />
				<strong>{nomeDoTime(partida, r.vencedor_id)}</strong> venceu {LADOS[r.lado_vencedor].noLado}
				{Icone && <> · <Icone size={14} aria-hidden="true" /> {resultado.rotulo}</>}
				{CERIMONIAS[r.ceremonia] && <span className="rounds__selo">{CERIMONIAS[r.ceremonia]}</span>}
			</p>
			<dl className="rounds__dados">
				{lados.map(({ lado, time, compra, loadout }) => {
					const { Icone: IconeLado, rotulo } = LADOS[lado]
					return (
						<div key={lado}>
							<dt><IconeLado size={14} aria-hidden="true" /> {rotulo}</dt>
							<dd>
								<Marcador partida={partida} timeId={time} />{nomeDoTime(partida, time)}
								<span className="muted numero"> · {compra} · {formatar('loadout_atk', loadout)}</span>
							</dd>
						</div>
					)
				})}
				<div>
					<dt>Spike</dt>
					<dd>{r.houve_plant ? `Plantada no ${r.plant_site}` : 'Não plantada'}{r.houve_defuse ? ' · desarmada' : ''}</dd>
				</div>
				<div>
					<dt>First kill</dt>
					<dd>
						{r.first_kill ? (
							<>
								<Nick puuid={r.first_kill.killer.puuid} nick={r.first_kill.killer.nick} /> em{' '}
								<Nick puuid={r.first_kill.vitima.puuid} nick={r.first_kill.vitima.nick} />
								<span className="muted numero"> · {formatar('tempo_s', r.first_kill.tempo_s)}</span>
							</>
						) : '—'}
					</dd>
				</div>
			</dl>
		</section>
	)
}

// Kill feed do round.
function KillFeed({ abates, partida }) {
	const ordenados = [...abates].sort((x, y) => x.tempo_s - y.tempo_s)
	return (
		<section className="card rounds__card">
			<h2>Kill feed</h2>
			{ordenados.length === 0 ? <p className="muted">Nenhum abate neste round.</p> : (
				<ol className="rounds__feed">
					{ordenados.map((a, i) => (
						<li key={i}>
							<span className="muted numero rounds__tempo">{formatar('tempo_s', a.tempo_s)}</span>
							<EventoAbate a={a} partida={partida} />
						</li>
					))}
				</ol>
			)}
		</section>
	)
}

// Loadout de cada time por round (T2.6c): o valor vem do lado que o time jogou (plano 3.4).
function Economia({ rounds, partida, selecionado }) {
	const { time_a: a, time_b: b } = partida
	const dados = [...rounds].sort((x, y) => x.round - y.round).map(r => {
		const aAtaca = r.time_atacante_id === a.id
		return {
			round: r.round,
			a: aAtaca ? r.loadout_atk : r.loadout_def,
			b: aAtaca ? r.loadout_def : r.loadout_atk,
			compraA: aAtaca ? r.compra_atk : r.compra_def,
			compraB: aAtaca ? r.compra_def : r.compra_atk,
		}
	})

	return (
		<section className="card rounds__card">
			<h2>Economia por round</h2>
			<p className="grafico-analise__eixo muted">Loadout do time (créditos)</p>
			<div className="grafico">
				<ResponsiveContainer width="100%" height="100%">
					<LineChart data={dados} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
						<CartesianGrid {...grade()} />
						<XAxis dataKey="round" {...eixo()} interval={0} />
						<YAxis {...eixo()} width={60} tickFormatter={v => formatar('loadout_atk', v)} />
						<Tooltip cursor={cursor()} content={<DicaEconomia a={a} b={b} />} />
						<ReferenceLine x={selecionado} stroke={cor('--text-muted')} strokeDasharray="4 4" />
						<Line dataKey="a" name={a.nome} stroke={cor('--time-a')} strokeWidth={2} dot={{ r: 3, fill: cor('--time-a') }} isAnimationActive={false} />
						<Line dataKey="b" name={b.nome} stroke={cor('--time-b')} strokeWidth={2} dot={{ r: 3, fill: cor('--time-b') }} isAnimationActive={false} />
					</LineChart>
				</ResponsiveContainer>
			</div>
			<ul className="grafico-analise__legenda">
				<li><span className="grafico-analise__cor" style={{ background: 'var(--time-a)' }} />{a.nome}</li>
				<li><span className="grafico-analise__cor" style={{ background: 'var(--time-b)' }} />{b.nome}</li>
			</ul>
		</section>
	)
}

function DicaEconomia({ active, payload, a, b }) {
	if (!active || !payload?.length) return null
	const d = payload[0].payload
	return (
		<div className="grafico-tooltip">
			<div><strong>Round {d.round}</strong></div>
			<div>{a.nome}: <strong>{formatar('loadout_atk', d.a)}</strong> <span className="muted">({d.compraA})</span></div>
			<div>{b.nome}: <strong>{formatar('loadout_atk', d.b)}</strong> <span className="muted">({d.compraB})</span></div>
		</div>
	)
}

export default Rounds
