import { Link } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { useApi } from '../api'
import { MIN_PARTIDAS_PADRAO } from '../constants'
import { contagem, formatar, linkAnalise } from '../formatos'
import Busca from '../components/Busca'
import Estado from '../components/Estado'
import LinhaPartida from '../components/LinhaPartida'
import Nick from '../components/Nick'
import NomeTime from '../components/NomeTime'
import './Home.css'

// Home (spec 7.1): busca, contadores, KPIs da EDA, últimas partidas e tops. Uma chamada só: /api/resumo.
function Home() {
	const resposta = useApi('resumo')

	return (
		<div className="conteudo home">
			<section className="home__hero">
				<h1>Estatísticas do circuito universitário de Valorant</h1>
				<Busca grande />
				{resposta.dados && <Contadores contadores={resposta.dados.contadores} />}
			</section>

			<Estado resposta={resposta} vazio={() => false}>
				{resumo => (
					<>
						<section className="grade home__kpis" style={{ '--grade-min': '220px' }} aria-label="Destaques">
							{resumo.kpis.map(k => <CartaoKpi key={k.analise_id} kpi={k} />)}
						</section>

						<div className="home__colunas">
							<section className="home__bloco">
								<header className="home__titulo">
									<h2>Últimas partidas</h2>
									<Link to="/partidas" className="home__ver">Ver todas <ArrowRight size={14} /></Link>
								</header>
								<ul className="home__partidas">
									{resumo.ultimas_partidas.map(p => <li key={p.match_id}><LinhaPartida partida={p} /></li>)}
								</ul>
							</section>

							<div className="home__lateral">
								<section className="card home__bloco">
									<header className="home__titulo">
										<h2>Top jogadores</h2>
										<Link to="/ranking" className="home__ver">Ranking <ArrowRight size={14} /></Link>
									</header>
									<ol className="home__top">
										{resumo.top_jogadores.map(j => (
											<li key={j.puuid}>
												<span className="home__posicao muted numero">{j.posicao}</span>
												<span className="home__quem"><Nick puuid={j.puuid} nick={j.nick} /><span className="muted home__sub">{j.time}</span></span>
												<span className="home__valor numero">{formatar('acs', j.acs)} <span className="muted">ACS</span></span>
											</li>
										))}
									</ol>
								</section>

								<section className="card home__bloco">
									<header className="home__titulo">
										<h2>Top times</h2>
										<Link to="/ranking/times" className="home__ver">Ranking <ArrowRight size={14} /></Link>
									</header>
									<ol className="home__top">
										{resumo.top_times.map(t => (
											<li key={t.time_id}>
												<span className="home__posicao muted numero">{t.posicao}</span>
												<span className="home__quem"><NomeTime id={t.time_id} nome={t.nome} /></span>
												<span className="home__valor numero">
													{t.vitorias}-{t.derrotas} <span className="muted">{formatar('win_pct', t.win_pct)}</span>
												</span>
											</li>
										))}
									</ol>
									<p className="muted home__nota">Times com {MIN_PARTIDAS_PADRAO} partidas ou mais.</p>
								</section>
							</div>
						</div>
					</>
				)}
			</Estado>
		</div>
	)
}

function Contadores({ contadores }) {
	const itens = [
		contagem(contadores.partidas, 'partida'), contagem(contadores.jogadores, 'jogador', 'jogadores'),
		contagem(contadores.times, 'time'), contagem(contadores.rounds, 'round'), contagem(contadores.abates, 'abate'),
	]
	return <p className="home__contadores muted numero">{itens.join(' · ')}</p>
}

// Cada KPI vem de uma análise e leva até ela.
function CartaoKpi({ kpi }) {
	const valor = kpi.unidade === '%' ? formatar('pct', kpi.valor) : `${formatar('valor', kpi.valor)}${kpi.unidade ?? ''}`
	return (
		<Link to={linkAnalise(kpi.analise_id)} className="card home__kpi">
			<span className="home__kpi-valor">{valor}</span>
			<span className="home__kpi-titulo">{kpi.titulo}</span>
			<span className="muted home__kpi-descricao">{kpi.descricao}</span>
		</Link>
	)
}

export default Home
