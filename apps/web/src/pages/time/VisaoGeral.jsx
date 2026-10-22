import { Link, useParams } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { useApi } from '../../api'
import { contagem, formatar, linkTime } from '../../formatos'
import { LIMITE_AMOSTRA } from '../../graficos/comum'
import AvisoAmostra from '../../components/AvisoAmostra'
import Estado from '../../components/Estado'
import LinhaPartida from '../../components/LinhaPartida'
import Tabela from '../../components/Tabela'
import './VisaoGeral.css'

const ULTIMAS = 5

// Win% de ataque e de defesa em barra com a cor do lado. Aqui o texto fica sem a cor de qualidade:
// o vermelho de --ruim ao lado da barra de ataque leria como o mesmo dado.
const COLUNAS_MAPA = [
	{ chave: 'mapa' },
	{ chave: 'partidas' },
	{ chave: 'vitorias', rotulo: 'V–D', alinhar: 'centro', formato: (v, m) => `${v}–${m.partidas - v}` },
	{ chave: 'win_pct' },
	{ chave: 'atk_win_pct', rotulo: 'Ataque', formato: v => <BarraPct pct={v} classe="visao__barra--atk" /> },
	{ chave: 'def_win_pct', rotulo: 'Defesa', formato: v => <BarraPct pct={v} classe="visao__barra--def" /> },
]

// Aba Visão geral do time (spec 7.6): últimas partidas, win% por tipo de compra e resumo por mapa.
function VisaoGeral() {
	const { id } = useParams()
	const perfil = useApi(`times/${id}`)

	return (
		<div className="visao">
			<UltimasPartidas id={id} />
			<Estado resposta={perfil} vazio={() => false}>
				{p => (
					<div className="visao__grade">
						<Economia linhas={p.economia} />
						<ResumoMapas id={id} linhas={p.por_mapa} />
					</div>
				)}
			</Estado>
		</div>
	)
}

function Bloco({ titulo, verTudo, children }) {
	return (
		<section className="visao__bloco">
			<header className="visao__cabecalho">
				<h2>{titulo}</h2>
				{verTudo && <Link to={verTudo} className="visao__ver">ver tudo <ArrowRight size={13} /></Link>}
			</header>
			{children}
		</section>
	)
}

function UltimasPartidas({ id }) {
	const resposta = useApi(`times/${id}/partidas`)
	return (
		<Bloco titulo="Últimas partidas" verTudo={`${linkTime(id)}/partidas`}>
			<Estado resposta={resposta} esqueleto="tabela" textoVazio="Nenhuma partida.">
				{partidas => (
					<ul className="visao__partidas">
						{partidas.slice(0, ULTIMAS).map(p => <li key={p.match_id}><LinhaPartida partida={p} timeId={id} /></li>)}
					</ul>
				)}
			</Estado>
		</Bloco>
	)
}

// Uma série só, com escala fixa de 0 a 100% e marca nos 50%. A barra é neutra: o azul da série 1 é o
// mesmo da defesa, que aparece no resumo por mapa ao lado.
function Economia({ linhas }) {
	return (
		<Bloco titulo="Win% por tipo de compra">
			{linhas.length === 0 ? <p className="muted">Sem rounds.</p> : (
				<ul className="card visao__economia">
					{linhas.map(e => (
						<li key={e.compra} title={`${e.compra}: ${formatar('win_pct', e.win_pct)} em ${contagem(e.rounds, 'round')}`}>
							<span className="visao__compra">{e.compra}</span>
							<BarraPct pct={e.win_pct} classe="visao__barra--neutra" />
							<span className="visao__rounds muted numero">{contagem(e.rounds, 'round')}</span>
						</li>
					))}
				</ul>
			)}
		</Bloco>
	)
}

function ResumoMapas({ id, linhas }) {
	const pequenas = linhas.filter(m => m.partidas < LIMITE_AMOSTRA)
	return (
		<Bloco titulo="Por mapa" verTudo={`${linkTime(id)}/mapas`}>
			<p className="visao__legenda muted">
				<span className="visao__marca visao__barra--atk" /> ataque
				<span className="visao__marca visao__barra--def" /> defesa
				<span className="visao__nota">· win% dos rounds em cada lado</span>
			</p>
			<Tabela
				linhas={linhas}
				colunas={COLUNAS_MAPA}
				chave={m => m.mapa}
				legenda="Resumo por mapa"
				classeLinha={m => m.partidas < LIMITE_AMOSTRA ? 'linha--amostra-pequena' : null}
			/>
			<AvisoAmostra itens={pequenas.map(m => ({ nome: m.mapa, n: m.partidas }))} />
		</Bloco>
	)
}

function BarraPct({ pct, classe }) {
	return (
		<span className="visao__pct">
			<span className="visao__escala" aria-hidden="true">
				<span className="visao__trilho">
					<span className={`visao__barra ${classe}`} style={{ width: `${pct ?? 0}%` }} />
				</span>
			</span>
			<span className="numero">{formatar('win_pct', pct)}</span>
		</span>
	)
}

export default VisaoGeral
