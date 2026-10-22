import { TriangleAlert } from 'lucide-react'
import { MAP_IMAGES } from '../constants'
import { contagem } from '../formatos'
import HeatmapCanvas from './HeatmapCanvas'
import './MapaCalor.css'

const POUCOS = 20

// Minimapa + calor + contador (spec 9). `pontos`: [x, y] ou { x, y } em [0,1], prontos da API (sem calibração
// no front); passe uma lista estável (ver HeatmapCanvas).
// `total` é o número de eventos (padrão: a quantidade de pontos). O mapa é quadrado e cabe na altura da tela.
function MapaCalor({ mapa, pontos, total = pontos.length }) {
	const imagem = MAP_IMAGES[String(mapa).toLowerCase()]
	return (
		<figure className="mapa-calor">
			<div className="mapa-calor__quadro">
				{imagem && <img className="mapa-calor__imagem" src={imagem} alt={`Minimapa de ${mapa}`} draggable={false} />}
				<HeatmapCanvas pontos={pontos} />
			</div>
			<figcaption className="mapa-calor__legenda">
				<span className="numero">{contagem(total, 'evento')}</span>
				{total < POUCOS && total > 0 && (
					<span className="mapa-calor__poucos"><TriangleAlert size={13} aria-hidden="true" /> poucos eventos: o calor exagera pontos isolados</span>
				)}
				<span className="mapa-calor__escala" aria-hidden="true"><span>menos</span><span className="mapa-calor__rampa" /><span>mais</span></span>
			</figcaption>
		</figure>
	)
}

export default MapaCalor
