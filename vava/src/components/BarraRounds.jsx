import { CERIMONIAS, LADOS, RESULTADOS } from '../constants'
import NomeTime from './NomeTime'
import './BarraRounds.css'

// Abreviações das cerimônias na coluna estreita; o nome completo vai no title e na legenda.
const ABREVIACOES = {
	CeremonyAce: 'A',
	CeremonyTeamAce: 'TA',
	CeremonyClutch: 'C',
	CeremonyFlawless: 'F',
	CeremonyThrifty: 'T',
	CeremonyCloser: 'CL',
}

// Rounds consecutivos com a mesma `metade` (1ª metade, 2ª metade, Prorrogação).
function segmentos(rounds) {
	const lista = []
	for (const r of [...rounds].sort((x, y) => x.round - y.round)) {
		const ultimo = lista[lista.length - 1]
		if (ultimo?.metade === r.metade) ultimo.rounds.push(r)
		else lista.push({ metade: r.metade, rounds: [r] })
	}
	return lista
}

// Histórico de rounds (spec 7.4): uma coluna por round, com o ícone do resultado na linha do time vencedor,
// na cor da equipe. O lado aparece em texto no cabeçalho de cada metade, nunca como cor (F12).
// Com `onSelecionar`, cada coluna vira um botão (clique, Tab e ←/→); `compacta` é a versão do Placar.
function BarraRounds({ rounds, partida, compacta = false, selecionado, onSelecionar }) {
	const { time_a: a, time_b: b } = partida
	const interativa = typeof onSelecionar === 'function'
	const ordenados = [...rounds].sort((x, y) => x.round - y.round)
	const presentes = [...new Set(rounds.map(r => r.ceremonia))].filter(c => ABREVIACOES[c])

	function aoTeclar(e) {
		if (!interativa || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return
		e.preventDefault()
		const i = ordenados.findIndex(r => r.round === selecionado)
		const proximo = ordenados[Math.min(Math.max(i + (e.key === 'ArrowRight' ? 1 : -1), 0), ordenados.length - 1)]
		onSelecionar(proximo.round)
		e.currentTarget.querySelector(`[data-round="${proximo.round}"]`)?.focus()
	}

	return (
		<div className={`barra-rounds ${compacta ? 'barra-rounds--compacta' : ''}`}>
			<div className="barra-rounds__corpo">
				<div className="barra-rounds__rotulos" aria-hidden="true">
					{!compacta && <span className="barra-rounds__cabecalho" />}
					<span className="barra-rounds__faixa-cerimonia" />
					<span className="barra-rounds__faixa barra-rounds__nome"><NomeTime id={a.id} nome={a.nome} equipe="a" /></span>
					<span className="barra-rounds__faixa-numero muted">Round</span>
					<span className="barra-rounds__faixa barra-rounds__nome"><NomeTime id={b.id} nome={b.nome} equipe="b" /></span>
				</div>

				<div className="barra-rounds__trilha rolagem-x" onKeyDown={aoTeclar} role={interativa ? 'group' : undefined} aria-label={interativa ? 'Rounds' : undefined}>
					{segmentos(rounds).map(seg => (
						<div key={seg.metade} className="barra-rounds__segmento">
							{!compacta && <span className="barra-rounds__cabecalho muted">{rotuloSegmento(seg, a)}</span>}
							<div className="barra-rounds__colunas">
								{seg.rounds.map(r => (
									<Coluna key={r.round} r={r} a={a} b={b} interativa={interativa} ativo={r.round === selecionado} onSelecionar={onSelecionar} />
								))}
							</div>
						</div>
					))}
				</div>
			</div>

			{!compacta && (
				<ul className="barra-rounds__legenda muted">
					{Object.entries(RESULTADOS).map(([chave, { Icone, rotulo }]) => (
						<li key={chave}><Icone size={13} aria-hidden="true" /> {rotulo}</li>
					))}
					{presentes.map(c => <li key={c}><strong>{ABREVIACOES[c]}</strong> {CERIMONIAS[c]}</li>)}
				</ul>
			)}
		</div>
	)
}

// "1ª metade · Wolf Gaming: DEF". Na prorrogação os lados alternam a cada round, então não há um só lado.
function rotuloSegmento(seg, a) {
	if (seg.metade === 'Prorrogação') return seg.metade
	const lado = seg.rounds[0].time_atacante_id === a.id ? 'Attacker' : 'Defender'
	return `${seg.metade} · ${a.nome}: ${LADOS[lado].curto}`
}

function Coluna({ r, a, b, interativa, ativo, onSelecionar }) {
	const resultado = RESULTADOS[r.resultado]
	const Icone = resultado?.Icone
	const vencedor = r.vencedor_id === a.id ? a : b
	const cerimonia = CERIMONIAS[r.ceremonia]
	const descricao = [
		`Round ${r.round}: ${vencedor.nome} venceu ${LADOS[r.lado_vencedor]?.noLado ?? ''}`.trim(),
		resultado?.rotulo, cerimonia,
	].filter(Boolean).join(' · ')

	const icone = equipe => (
		<span className={`barra-rounds__faixa barra-rounds__celula ${r.vencedor_id === (equipe === 'a' ? a.id : b.id) ? `barra-rounds__celula--${equipe}` : ''}`}>
			{r.vencedor_id === (equipe === 'a' ? a.id : b.id) && Icone && <Icone size={16} aria-hidden="true" />}
		</span>
	)
	const conteudo = (
		<>
			<span className="barra-rounds__faixa-cerimonia barra-rounds__cerimonia">{cerimonia && ABREVIACOES[r.ceremonia]}</span>
			{icone('a')}
			<span className="barra-rounds__faixa-numero numero">{r.round}</span>
			{icone('b')}
		</>
	)

	return interativa ? (
		<button
			type="button"
			data-round={r.round}
			className={`barra-rounds__coluna ${ativo ? 'barra-rounds__coluna--ativa' : ''}`}
			aria-pressed={ativo}
			aria-label={descricao}
			title={descricao}
			tabIndex={ativo ? 0 : -1}
			onClick={() => onSelecionar(r.round)}
		>
			{conteudo}
		</button>
	) : (
		<div className="barra-rounds__coluna" title={descricao}>{conteudo}</div>
	)
}

export default BarraRounds
