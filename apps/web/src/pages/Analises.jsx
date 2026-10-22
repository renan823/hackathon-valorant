import { useApi } from '../api'
import { CATEGORIAS } from '../constants'
import { useFiltros, useParametro } from '../filtros'
import Abas from '../components/Abas'
import BarraFiltros from '../components/BarraFiltros'
import CartaoAnalise from '../components/CartaoAnalise'
import Estado from '../components/Estado'
import './Analises.css'

const rotuloCategoria = c => CATEGORIAS[c] ?? c.charAt(0).toUpperCase() + c.slice(1)

// Categorias conhecidas na ordem da spec (Mapas, Momentos decisivos, Economia, Meta, Jogadores);
// uma categoria nova do backend entra no fim, na ordem em que aparece.
const ORDEM = Object.keys(CATEGORIAS)
const posicao = c => (ORDEM.includes(c) ? ORDEM.indexOf(c) : ORDEM.length)

// Página Análises (spec 7.7): abas montadas a partir da lista (categoria nova vira aba sozinha),
// os 6 filtros comuns e um card por análise da aba.
function Analises() {
	const lista = useApi('analises')
	const { filtros } = useFiltros()
	const [escolhida] = useParametro('categoria')

	return (
		<section className="conteudo analises">
			<h1>Análises</h1>
			<BarraFiltros campos={['torneio', 'fase', 'mapa', 'time', 'agente', 'funcao']} />
			<Estado resposta={lista}>
				{analises => {
					const categorias = [...new Set(analises.map(a => a.categoria))].sort((a, b) => posicao(a) - posicao(b))
					const categoria = categorias.includes(escolhida) ? escolhida : categorias[0]
					return (
						<>
							<Abas parametro="categoria" itens={categorias.map(c => ({ rotulo: rotuloCategoria(c), valor: c }))} />
							<div className="analises__cards">
								{analises.filter(a => a.categoria === categoria).map(a => (
									<CartaoAnalise key={a.id} id={a.id} filtros={filtros} />
								))}
							</div>
						</>
					)
				}}
			</Estado>
		</section>
	)
}

export default Analises
