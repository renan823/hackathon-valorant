import { useParams } from 'react-router'
import { useFiltros } from '../filtros'
import BarraFiltros from '../components/BarraFiltros'
import CartaoAnalise from '../components/CartaoAnalise'
import './Analises.css'

// Análise em tela cheia (spec 7.7): o mesmo card em largura total, com os filtros e o KPI em destaque.
// Id inexistente → a API responde 404 e o card mostra "Não encontrado". "Ver dados" fica no card (`completo`).
function Analise() {
	const { id } = useParams()
	const { filtros } = useFiltros()

	return (
		<section className="conteudo analises">
			<BarraFiltros campos={['torneio', 'fase', 'mapa', 'time', 'agente', 'funcao']} />
			<CartaoAnalise id={id} filtros={filtros} completo />
		</section>
	)
}

export default Analise
