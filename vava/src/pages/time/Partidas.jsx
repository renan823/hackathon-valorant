import { useParams } from 'react-router'
import { useApi } from '../../api'
import { useFiltros } from '../../filtros'
import { contagem } from '../../formatos'
import BarraFiltros from '../../components/BarraFiltros'
import Estado from '../../components/Estado'
import LinhaPartida from '../../components/LinhaPartida'
import './Partidas.css'

// Aba Partidas do time (spec 7.6): todas as partidas, com o time em destaque. Um time tem poucas
// dezenas de partidas, então a lista vem inteira (sem "carregar mais").
function Partidas() {
	const { id } = useParams()
	const { filtros } = useFiltros()
	const resposta = useApi(`times/${id}/partidas`, { torneio: filtros.torneio, fase: filtros.fase, mapa: filtros.mapa })

	return (
		<div className="partidas-time">
			<BarraFiltros campos={['torneio', 'fase', 'mapa']} />
			<Estado resposta={resposta} esqueleto="tabela">
				{partidas => (
					<>
						<p className="muted numero">{contagem(partidas.length, 'partida')}</p>
						<ul className="partidas-time__lista">
							{partidas.map(p => <li key={p.match_id}><LinhaPartida partida={p} timeId={id} /></li>)}
						</ul>
					</>
				)}
			</Estado>
		</div>
	)
}

export default Partidas
