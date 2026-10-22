import { useState } from 'react'
import { useApi } from '../api'
import { useFiltros } from '../filtros'
import BarraFiltros from '../components/BarraFiltros'
import Estado from '../components/Estado'
import LinhaPartida from '../components/LinhaPartida'
import './Partidas.css'

const POR_VEZ = 30

// All Matches do csstats (spec 7.3): mais recentes primeiro, 30 por vez.
function Partidas() {
	const { filtros } = useFiltros()
	const resposta = useApi('partidas', filtros)

	// Trocar um filtro volta a paginação para o início: a quantidade vale só para a mesma consulta.
	const chave = JSON.stringify(filtros)
	const [pagina, setPagina] = useState({ chave, quantas: POR_VEZ })
	const quantas = pagina.chave === chave ? pagina.quantas : POR_VEZ

	return (
		<section className="conteudo partidas">
			<header className="partidas__cabecalho">
				<h1>Partidas</h1>
				{resposta.dados && <span className="muted numero">{resposta.dados.length} partidas</span>}
			</header>

			<BarraFiltros campos={['torneio', 'fase', 'mapa', 'time']} />

			<Estado resposta={resposta} esqueleto="tabela">
				{partidas => (
					<>
						<ul className="partidas__lista">
							{partidas.slice(0, quantas).map(p => (
								<li key={p.match_id}><LinhaPartida partida={p} /></li>
							))}
						</ul>
						{quantas < partidas.length && (
							<button className="botao partidas__mais" onClick={() => setPagina({ chave, quantas: quantas + POR_VEZ })}>
								Carregar mais ({partidas.length - quantas} restantes)
							</button>
						)}
					</>
				)}
			</Estado>
		</section>
	)
}

export default Partidas
