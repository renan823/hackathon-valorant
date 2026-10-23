import { useParams } from 'react-router'
import { useApi } from '../../api'
import { contagem, formatar } from '../../formatos'
import Estado from '../../components/Estado'
import IconeArma from '../../components/IconeArma'
import Alvos from './Alvos'
import './Armas.css'

// Aba Armas do jogador (spec 7.5): barras horizontais de `pct`, agrupadas por categoria_meio. Barras em HTML:
// o nome da arma fica legível em qualquer largura. Uma série só (cor 1); a categoria vem no título do grupo.
function Armas() {
	const { puuid } = useParams()
	const resposta = useApi(`jogadores/${puuid}`)
	return (
		<Estado resposta={resposta} vazio={p => p.armas.length === 0} textoVazio="Nenhum abate registrado.">
			{p => {
				const maior = Math.max(...p.armas.map(a => a.pct))
				// Grupos na ordem da categoria com mais abates.
				const grupos = []
				for (const a of p.armas) {
					let g = grupos.find(x => x.categoria === a.categoria_meio)
					if (!g) grupos.push(g = { categoria: a.categoria_meio, armas: [], kills: 0 })
					g.armas.push(a)
					g.kills += a.kills
				}
				grupos.sort((x, y) => y.kills - x.kills)
				return (
					<div className="armas">
						<div className="armas__uso">
							{grupos.map(g => (
								<section key={g.categoria} className="card armas__grupo">
									<h2>{formatar('categoria_meio', g.categoria)} <span className="muted">· {contagem(g.kills, 'kill')}</span></h2>
									<ul>
										{g.armas.map(a => (
											<li key={a.meio}>
												<span className="armas__nome"><IconeArma meio={a.meio} categoria={a.categoria_meio} comNome /></span>
												<span className="armas__trilho" aria-hidden="true">
													<span className="armas__barra" style={{ width: `${(100 * a.pct) / maior}%` }} />
												</span>
												<span className="armas__valor numero">{formatar('pct', a.pct)} <span className="muted">({a.kills})</span></span>
											</li>
										))}
									</ul>
								</section>
							))}
						</div>
						<Alvos />
					</div>
				)
			}}
		</Estado>
	)
}

export default Armas
