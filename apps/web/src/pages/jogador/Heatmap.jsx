import { useParams } from 'react-router'
import { useApi } from '../../api'
import Estado from '../../components/Estado'
import PainelHeatmap from '../../components/PainelHeatmap'

// Aba Heatmap do jogador (spec 7.5): os mapas vêm de `por_mapa` (o mais jogado primeiro).
function Heatmap() {
	const { puuid } = useParams()
	const perfil = useApi(`jogadores/${puuid}`)

	return (
		<Estado resposta={perfil} vazio={p => p.por_mapa.length === 0} textoVazio="Nenhuma partida.">
			{p => <PainelHeatmap mapas={p.por_mapa.map(m => m.mapa)} filtro={{ jogador: puuid }} />}
		</Estado>
	)
}

export default Heatmap
