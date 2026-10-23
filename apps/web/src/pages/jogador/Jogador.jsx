import { Outlet, useParams } from 'react-router'
import { useApi } from '../../api'
import { MIN_ROUNDS_PADRAO } from '../../constants'
import { contagem, dividirNick, linkJogador } from '../../formatos'
import Abas from '../../components/Abas'
import Estado from '../../components/Estado'
import NomeTime from '../../components/NomeTime'
import StatTile from '../../components/StatTile'
import './Jogador.css'

const TILES = ['acs', 'kd', 'adr', 'kast_pct', 'hs_pct', 'win_pct', 'fk_round', 'mais_menos']

// Layout do perfil (spec 7.5): cabeçalho, tiles e abas. As abas usam a mesma resposta (cache).
function Jogador() {
	const { puuid } = useParams()
	const resposta = useApi(`jogadores/${puuid}`)

	return (
		<Estado resposta={resposta} vazio={() => false}>
			{perfil => (
				<article className="conteudo jogador">
					<Cabecalho perfil={perfil} />
					<div className="grade jogador__tiles" style={{ '--grade-min': '120px' }}>
						{TILES.map(c => <StatTile key={c} coluna={c} valor={perfil.resumo[c]} />)}
					</div>
					<Abas itens={[
						{ rotulo: 'Resumo', para: linkJogador(puuid) },
						{ rotulo: 'Partidas', para: `${linkJogador(puuid)}/partidas` },
						{ rotulo: 'Agentes', para: `${linkJogador(puuid)}/agentes` },
						{ rotulo: 'Mapas', para: `${linkJogador(puuid)}/mapas` },
						{ rotulo: 'Arsenal', para: `${linkJogador(puuid)}/armas` },
						{ rotulo: 'Heatmap', para: `${linkJogador(puuid)}/heatmap` },
					]} />
					<Outlet />
				</article>
			)}
		</Estado>
	)
}

function Cabecalho({ perfil }) {
	const { nome, tag } = dividirNick(perfil.nick)
	const { resumo } = perfil

	return (
		<header className="jogador__cabecalho">
			<div className="jogador__identidade">
				<h1 className="jogador__nick">
					{nome}{tag && <span className="jogador__tag">#{tag}</span>}
				</h1>
				{perfil.nicks_anteriores.length > 0 && (
					<p className="muted jogador__antes">antes: {perfil.nicks_anteriores.join(', ')}</p>
				)}
			</div>

			<div className="jogador__dados">
				<p className="jogador__ranking">
					{resumo.posicao_ranking
						? <><strong>#{resumo.posicao_ranking}</strong> no ranking</>
						: <span className="muted">fora do ranking, menos de {MIN_ROUNDS_PADRAO} rounds</span>}
				</p>
				<p className="jogador__times">
					{perfil.times.map(t => (
						<span key={t.id} className="jogador__time">
							<NomeTime id={t.id} nome={t.nome} /> <span className="muted numero">({t.partidas})</span>
						</span>
					))}
				</p>
				<p className="muted">
					{`${resumo.agente_principal} (${resumo.funcao_principal}) · ${contagem(resumo.partidas, 'partida')} · ${contagem(resumo.rounds, 'round')}`}
				</p>
			</div>
		</header>
	)
}

export default Jogador
