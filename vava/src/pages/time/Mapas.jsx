import { Link, useParams } from 'react-router'
import { Flame } from 'lucide-react'
import { useApi } from '../../api'
import { MAP_IMAGES } from '../../constants'
import { contagem, corQualidade, formatar, linkTime } from '../../formatos'
import { LIMITE_AMOSTRA } from '../../graficos/comum'
import AvisoAmostra from '../../components/AvisoAmostra'
import Estado from '../../components/Estado'
import './Mapas.css'

const METRICAS = ['win_pct', 'saldo_rounds', 'atk_win_pct', 'def_win_pct']

// Aba Mapas do time (spec 7.6): um card por mapa (`por_mapa`) com as composições usadas nele. Aqui os
// lados são texto (ATK/DEF), sem cor: as métricas já usam a cor de qualidade.
function Mapas() {
	const { id } = useParams()
	const resposta = useApi(`times/${id}`)
	return (
		<Estado resposta={resposta} vazio={p => p.por_mapa.length === 0} textoVazio="Nenhuma partida.">
			{p => {
				const pequenas = p.por_mapa.filter(m => m.partidas < LIMITE_AMOSTRA)
				return (
					<div className="mapas-time">
						<AvisoAmostra itens={pequenas.map(m => ({ nome: m.mapa, n: m.partidas }))} />
						<div className="grade" style={{ '--grade-min': 'min(100%, 360px)' }}>
							{p.por_mapa.map(m => (
								<CartaoMapa key={m.mapa} id={id} mapa={m} composicoes={p.composicoes.filter(c => c.mapa === m.mapa)} />
							))}
						</div>
					</div>
				)
			}}
		</Estado>
	)
}

function CartaoMapa({ id, mapa: m, composicoes }) {
	return (
		<section className="card mapas-time__card" style={{ '--imagem-mapa': `url(${MAP_IMAGES[m.mapa.toLowerCase()]})` }}>
			<header className="mapas-time__cabecalho">
				<h2>{m.mapa}</h2>
				<Link to={`${linkTime(id)}/heatmap?mapa=${encodeURIComponent(m.mapa)}`} className="mapas-time__heatmap">
					<Flame size={13} aria-hidden="true" /> heatmap
				</Link>
			</header>
			<p className="muted">{contagem(m.partidas, 'partida')} · {m.vitorias}V {m.partidas - m.vitorias}D</p>
			<dl className="mapas-time__metricas">
				{METRICAS.map(c => (
					<div key={c}>
						<dt>{formatar('metrica', c)}</dt>
						<dd className={`numero ${corQualidade(c, m[c]) ?? ''}`}>{formatar(c, m[c])}</dd>
					</div>
				))}
			</dl>

			<h3 className="mapas-time__subtitulo">{contagem(composicoes.length, 'composição', 'composições')}</h3>
			<ul className="mapas-time__composicoes">
				{composicoes.map(c => (
					<li key={c.agentes.join()}>
						<span className="mapas-time__agentes">{c.agentes.join(' · ')}</span>
						<span className="mapas-time__resultado numero">
							<span className="muted">{c.vitorias}–{c.partidas - c.vitorias}</span>{' '}
							<span className={corQualidade('win_pct', c.win_pct) ?? ''}>{formatar('win_pct', c.win_pct)}</span>
						</span>
					</li>
				))}
			</ul>
		</section>
	)
}

export default Mapas
