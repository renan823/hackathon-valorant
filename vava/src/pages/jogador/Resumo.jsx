import { Link, useParams } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useApi } from '../../api'
import { useParametro } from '../../filtros'
import { contagem, formatar, formatarData, linkJogador, rotulo } from '../../formatos'
import { cor, cursor, eixo, grade } from '../../graficos/comum'
import Estado from '../../components/Estado'
import '../../graficos/graficos.css'
import './Resumo.css'

const METRICAS = ['acs', 'adr', 'kd', 'kast_pct']

// Aba Resumo do jogador (spec 7.5): evolução por partida + top agentes, mapas e armas.
function Resumo() {
	const { puuid } = useParams()
	const resposta = useApi(`jogadores/${puuid}`)

	return (
		<Estado resposta={resposta} vazio={() => false}>
			{perfil => (
				<div className="resumo">
					<Evolucao partidas={perfil.evolucao} />
					<div className="resumo__tops">
						<Top titulo="Agentes" verTudo={`${linkJogador(puuid)}/agentes`} linhas={perfil.por_agente.slice(0, 3)}
							nome={a => <>{a.agente} <span className="muted">· {a.funcao}</span></>}
							valores={a => [contagem(a.partidas, 'partida'), formatar('win_pct', a.win_pct), `ACS ${formatar('acs', a.acs)}`]} />
						<Top titulo="Mapas" verTudo={`${linkJogador(puuid)}/mapas`} linhas={perfil.por_mapa.slice(0, 3)}
							nome={m => m.mapa}
							valores={m => [contagem(m.partidas, 'partida'), formatar('win_pct', m.win_pct), `ACS ${formatar('acs', m.acs)}`]} />
						<Top titulo="Armas" verTudo={`${linkJogador(puuid)}/armas`} linhas={perfil.armas.slice(0, 5)}
							nome={a => a.meio}
							valores={a => [contagem(a.kills, 'kill'), formatar('pct', a.pct)]} />
					</div>
				</div>
			)}
		</Estado>
	)
}

function Evolucao({ partidas }) {
	const [metrica, setMetrica] = useParametro('metrica', 'acs')
	const dados = partidas.map((p, i) => ({ ...p, ordem: i + 1, rotuloData: formatarData(p.data, { curta: true }) }))

	return (
		<section className="card resumo__evolucao">
			<header className="resumo__cabecalho">
				<h2>Evolução por partida</h2>
				<div className="resumo__metricas" role="group" aria-label="Métrica">
					{METRICAS.map(m => (
						<button key={m} className={`chip ${m === metrica ? 'chip--ativo' : ''}`} aria-pressed={m === metrica} onClick={() => setMetrica(m)}>
							{rotulo(m)}
						</button>
					))}
				</div>
			</header>
			<div className="grafico">
				<ResponsiveContainer width="100%" height="100%">
					<LineChart data={dados} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
						<CartesianGrid {...grade()} />
						<XAxis dataKey="ordem" {...eixo()} tickFormatter={i => dados[i - 1]?.rotuloData ?? ''} />
						<YAxis {...eixo()} width={44} tickFormatter={v => formatar(metrica, v)} domain={['auto', 'auto']} />
						<Tooltip cursor={cursor()} content={<DicaPartida metrica={metrica} />} />
						<Line
							type="monotone"
							dataKey={metrica}
							stroke={cor('--serie-1')}
							strokeWidth={2}
							dot={<PontoResultado />}
							activeDot={<PontoResultado ativo />}
							isAnimationActive={false}
						/>
					</LineChart>
				</ResponsiveContainer>
			</div>
			<p className="resumo__legenda muted">
				<span className="resumo__ponto resumo__ponto--v" /> vitória
				<span className="resumo__ponto resumo__ponto--d" /> derrota
			</p>
		</section>
	)
}

// Vitória: ponto cheio em --bom; derrota: vazado em --ruim. A forma também diz o resultado (não só a cor).
function PontoResultado({ cx, cy, payload, ativo }) {
	if (cx === undefined || cy === undefined) return null
	const r = ativo ? 6 : 4.5
	return payload.venceu
		? <circle cx={cx} cy={cy} r={r} fill={cor('--bom')} stroke={cor('--surface')} strokeWidth={2} />
		: <circle cx={cx} cy={cy} r={r} fill={cor('--surface')} stroke={cor('--ruim')} strokeWidth={2} />
}

function DicaPartida({ active, payload, metrica }) {
	if (!active || !payload?.length) return null
	const p = payload[0].payload
	return (
		<div className="grafico-tooltip">
			<div>{formatarData(p.data)} · {p.mapa} · <span className={p.venceu ? 'bom' : 'ruim'}>{p.venceu ? 'Vitória' : 'Derrota'}</span></div>
			<div>{rotulo(metrica)} <strong>{formatar(metrica, p[metrica])}</strong></div>
		</div>
	)
}

function Top({ titulo, verTudo, linhas, nome, valores }) {
	return (
		<section className="card resumo__top">
			<header className="resumo__top-cabecalho">
				<h3>{titulo}</h3>
				<Link to={verTudo} className="resumo__ver">ver tudo <ArrowRight size={13} /></Link>
			</header>
			<ol>
				{linhas.map((l, i) => (
					<li key={i}>
						<span className="resumo__nome">{nome(l)}</span>
						<span className="resumo__valores muted numero">{valores(l).join(' · ')}</span>
					</li>
				))}
			</ol>
		</section>
	)
}

export default Resumo
