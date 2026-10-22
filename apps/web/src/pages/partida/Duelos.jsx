import { lazy, Suspense } from 'react'
import { useParams } from 'react-router'
import { juntarRespostas, useApi } from '../../api'
import { useParametro } from '../../filtros'
import Estado from '../../components/Estado'
import MatrizDuelos from '../../components/MatrizDuelos'

// A biblioteca do grafo é pesada e só esta aba a usa: carregada sob demanda, fora do pacote principal.
const GrafoDuelos = lazy(() => import('../../components/GrafoDuelos'))

const VISOES = [['matriz', 'Matriz'], ['grafo', 'Grafo']]

// Aba Duelos (spec 7.4): matriz (padrão, a visão acessível) ou grafo de força. A visão fica na URL.
function Duelos() {
	const { id } = useParams()
	const partida = useApi(`partidas/${id}`)
	const duelos = useApi(`partidas/${id}/duelos`)
	const [visao, setVisao] = useParametro('visao', 'matriz')

	return (
		<Estado resposta={juntarRespostas(partida, duelos)} vazio={() => false} esqueleto="tabela">
			{([{ partida: p }, d]) => (
				<section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
					<div role="group" aria-label="Visão" style={{ display: 'flex', gap: 6 }}>
						{VISOES.map(([v, rotulo]) => (
							<button key={v} className={`chip ${visao === v ? 'chip--ativo' : ''}`} aria-pressed={visao === v} onClick={() => setVisao(v)}>{rotulo}</button>
						))}
					</div>
					{visao === 'grafo'
						? (
							<Suspense fallback={<p className="muted">Carregando o grafo…</p>}>
								<GrafoDuelos duelos={d} partida={p} />
							</Suspense>
						)
						: <MatrizDuelos duelos={d} partida={p} />}
				</section>
			)}
		</Estado>
	)
}

export default Duelos
