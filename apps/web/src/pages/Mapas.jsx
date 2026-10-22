import { Link } from 'react-router'
import { juntarRespostas, useApi } from '../api'
import { MAP_IMAGES } from '../constants'
import { contagem, linkMapa } from '../formatos'
import { LIMITE_AMOSTRA } from '../graficos/comum'
import AvisoAmostra from '../components/AvisoAmostra'
import BarraLados from '../components/BarraLados'
import Estado from '../components/Estado'
import './Mapas.css'

// Grade de mapas (spec 7.8): os mapas de /filtros, com partidas e lados de /analises/lado-por-mapa (uma
// chamada só para todos). Ordem: mais jogado primeiro; mapa sem partida vai para o fim.
function Mapas() {
	const resposta = juntarRespostas(useApi('filtros'), useApi('analises/lado-por-mapa'))

	return (
		<section className="conteudo mapas">
			<header>
				<h1>Mapas</h1>
				<p className="muted">Rounds vencidos por cada lado. A marca no meio da barra é 50%.</p>
			</header>
			<Estado resposta={resposta} vazio={([filtros]) => filtros.mapas.length === 0}>
				{([filtros, analise]) => {
					const porMapa = new Map(analise.dados.map(l => [l.mapa, l]))
					const mapas = [...filtros.mapas].sort((a, b) => (porMapa.get(b)?.partidas ?? 0) - (porMapa.get(a)?.partidas ?? 0))
					return (
						<div className="grade mapas__grade">
							{mapas.map(m => <CartaoMapa key={m} mapa={m} linha={porMapa.get(m)} />)}
						</div>
					)
				}}
			</Estado>
		</section>
	)
}

function CartaoMapa({ mapa, linha }) {
	return (
		<Link to={linkMapa(mapa)} className="card mapas__card" style={{ '--imagem-mapa': `url(${MAP_IMAGES[mapa.toLowerCase()]})` }}>
			<span className="mapas__nome">{mapa}</span>
			{linha ? (
				<>
					<span className="muted numero">{contagem(linha.partidas, 'partida')} · {contagem(linha.rounds, 'round')}</span>
					{linha.partidas < LIMITE_AMOSTRA && <AvisoAmostra n={linha.partidas} />}
					<span className="mapas__lados"><BarraLados atk={linha.atk_win_pct} /></span>
				</>
			) : (
				<span className="muted">Nenhuma partida</span>
			)}
		</Link>
	)
}

export default Mapas
