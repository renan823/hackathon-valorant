import { Link, useParams } from 'react-router'
import { useApi } from '../../api'
import { MAP_IMAGES } from '../../constants'
import { contagem, corQualidade, formatar, linkJogador } from '../../formatos'
import Estado from '../../components/Estado'
import './Mapas.css'

const METRICAS = ['win_pct', 'acs', 'kd', 'kast_pct']

// Aba Mapas do jogador (spec 7.5): um card por mapa, com o minimapa ao fundo, em grade auto-fit.
// O card abre o heatmap do jogador naquele mapa.
function Mapas() {
	const { puuid } = useParams()
	const resposta = useApi(`jogadores/${puuid}`)
	return (
		<Estado resposta={resposta} vazio={() => false}>
			{p => (
				<div className="grade mapas-jogador" style={{ '--grade-min': '220px' }}>
					{p.por_mapa.map(m => (
						<Link
							key={m.mapa}
							to={`${linkJogador(puuid)}/heatmap?mapa=${encodeURIComponent(m.mapa)}`}
							className="card mapas-jogador__card"
							style={{ '--imagem-mapa': `url(${MAP_IMAGES[m.mapa.toLowerCase()]})` }}
						>
							<span className="mapas-jogador__nome">{m.mapa}</span>
							<span className="muted">{contagem(m.partidas, 'partida')} · {contagem(m.rounds, 'round')}</span>
							<dl className="mapas-jogador__metricas">
								{METRICAS.map(c => (
									<div key={c}>
										<dt>{formatar('metrica', c)}</dt>
										<dd className={`numero ${corQualidade(c, m[c]) ?? ''}`}>{formatar(c, m[c])}</dd>
									</div>
								))}
							</dl>
						</Link>
					))}
				</div>
			)}
		</Estado>
	)
}

export default Mapas
