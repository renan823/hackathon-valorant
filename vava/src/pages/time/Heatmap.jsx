import { useParams } from 'react-router'
import { useApi } from '../../api'
import Estado from '../../components/Estado'
import PainelHeatmap from '../../components/PainelHeatmap'

// Aba Heatmap do time (spec 7.6): os mapas vêm de `por_mapa` (o mais jogado primeiro); as ações são dos
// jogadores do time (onde o time matou ou morreu).
function Heatmap() {
	const { id } = useParams()
	const perfil = useApi(`times/${id}`)

	return (
		<Estado resposta={perfil} vazio={p => p.por_mapa.length === 0} textoVazio="Nenhuma partida.">
			{p => <PainelHeatmap mapas={p.por_mapa.map(m => m.mapa)} filtro={{ time: id }} />}
		</Estado>
	)
}

export default Heatmap
