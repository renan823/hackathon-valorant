import { lazy, Suspense, useState } from 'react'
import { useParams } from 'react-router'
import { juntarRespostas, useApi } from '../../api'
import { useParametro } from '../../filtros'
import Estado from '../../components/Estado'
import MatrizDuelos from '../../components/MatrizDuelos'
import ModalDuelo from '../../components/ModalDuelo'

// A biblioteca do grafo é pesada e só esta aba a usa: carregada sob demanda, fora do pacote principal.
const GrafoDuelos = lazy(() => import('../../components/GrafoDuelos'))

const VISOES = [['matriz', 'Matriz'], ['grafo', 'Grafo']]

// Aba Duelos (spec 7.4): matriz (padrão, a visão acessível) ou grafo de força. A visão fica na URL.
// Ao clicar numa aresta do grafo, abre o ModalDuelo com o heatmap dos embates entre os dois jogadores.
function Duelos() {
	const { id } = useParams()
	const partida = useApi(`partidas/${id}`)
	const duelos = useApi(`partidas/${id}/duelos`)
	const abates = useApi(`partidas/${id}/abates`)
	const [visao, setVisao] = useParametro('visao', 'matriz')
	const [arestaSelecionada, setArestaSelecionada] = useState(null)

	return (
		<Estado resposta={juntarRespostas(partida, duelos, abates)} vazio={() => false} esqueleto="tabela">
			{([{ partida: p }, d, { mapa, abates: todosAbates }]) => (
				<section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
					<div role="group" aria-label="Visão" style={{ display: 'flex', gap: 6 }}>
						{VISOES.map(([v, rotulo]) => (
							<button key={v} className={`chip ${visao === v ? 'chip--ativo' : ''}`} aria-pressed={visao === v} onClick={() => setVisao(v)}>{rotulo}</button>
						))}
					</div>
					{visao === 'grafo'
						? (
							<Suspense fallback={<p className="muted">Carregando o grafo…</p>}>
								<GrafoDuelos
									duelos={d}
									partida={p}
									onArestaClick={setArestaSelecionada}
								/>
							</Suspense>
						)
						: <MatrizDuelos duelos={d} partida={p} />}

					{arestaSelecionada && (
						<ModalDuelo
							aresta={arestaSelecionada}
							todosAbates={todosAbates}
							mapa={mapa}
							partida={p}
							nos={d.nos}
							onFechar={() => setArestaSelecionada(null)}
						/>
					)}
				</section>
			)}
		</Estado>
	)
}

export default Duelos
