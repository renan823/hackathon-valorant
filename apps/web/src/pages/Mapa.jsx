import { Link, useParams } from 'react-router'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useApi } from '../api'
import { MAP_IMAGES, MIN_ROUNDS_PADRAO } from '../constants'
import { contagem, linkJogador } from '../formatos'
import { LIMITE_AMOSTRA } from '../graficos/comum'
import AvisoAmostra from '../components/AvisoAmostra'
import BarraLados from '../components/BarraLados'
import CartaoAnalise from '../components/CartaoAnalise'
import Estado from '../components/Estado'
import Nick from '../components/Nick'
import PainelHeatmap from '../components/PainelHeatmap'
import Tabela from '../components/Tabela'
import NaoEncontrado from './NaoEncontrado'
import './Mapa.css'

const TOP = 10

const COLUNAS_TOP = [
	{
		chave: 'nick',
		ordenavel: false,
		link: j => linkJogador(j.puuid),
		formato: (_, j) => <span className="mapa__jogador"><span className="mapa__posicao numero">{j.posicao}</span><Nick nick={j.nick} /></span>,
	},
	{ chave: 'time' },
	{ chave: 'partidas' },
	{ chave: 'acs', cor: true },
	{ chave: 'kd', cor: true },
]

// Página do mapa (spec 7.8), com o nome como vem da API (/mapas/Ascent). Nome fora de /filtros → 404.
function Mapa() {
	const { mapa } = useParams()
	const opcoes = useApi('filtros')
	return (
		<Estado resposta={opcoes} vazio={() => false}>
			{o => (o.mapas.includes(mapa) ? <PaginaMapa mapa={mapa} /> : <NaoEncontrado />)}
		</Estado>
	)
}

// Explorador de heatmap (com os próprios filtros, dentro do card) + top 10 e as análises do mapa.
// O lado-por-mapa vira o cabeçalho (barra ataque | defesa): com um mapa só, o gráfico seria uma barra solitária.
function PaginaMapa({ mapa }) {
	const filtroMapa = { mapa: [mapa] }

	return (
		<section className="conteudo mapa">
			<Cabecalho mapa={mapa} />

			<div className="mapa__colunas">
				<section className="card mapa__explorador">
					<h2>Explorador de heatmap</h2>
					<PainelHeatmap
						mapas={[mapa]}
						tipos={[
							'kills', 'mortes', 'plants', 'ability_kills', 'ability_deaths',
							'postplant_ability_kills', 'postplant_ability_deaths',
						]}
						campos={['torneio', 'fase', 'time', 'agente', 'funcao']}
					/>
				</section>
				<div className="mapa__lateral">
					<TopJogadores mapa={mapa} />
					<CartaoAnalise id="plant-sites" filtros={filtroMapa} />
				</div>
			</div>

			<CartaoAnalise id="meta-agentes" filtros={filtroMapa} />
		</section>
	)
}

function Cabecalho({ mapa }) {
	// Sem filtro: a mesma resposta da grade de /mapas, que já está no cache quando se chega por ela.
	const { dados } = useApi('analises/lado-por-mapa')
	const linha = dados?.dados.find(l => l.mapa === mapa)

	return (
		<header className="mapa__cabecalho" style={{ '--imagem-mapa': `url(${MAP_IMAGES[mapa.toLowerCase()]})` }}>
			<Link to="/mapas" className="mapa__voltar"><ArrowLeft size={14} /> Mapas</Link>
			<h1>{mapa}</h1>
			{linha && (
				<>
					<p className="muted numero">{contagem(linha.partidas, 'partida')} · {contagem(linha.rounds, 'round')}</p>
					{linha.partidas < LIMITE_AMOSTRA && <AvisoAmostra n={linha.partidas} />}
					<div className="mapa__lados"><BarraLados atk={linha.atk_win_pct} /></div>
				</>
			)}
		</header>
	)
}

function TopJogadores({ mapa }) {
	const resposta = useApi('jogadores', { mapa, limite: TOP })
	return (
		<section className="card mapa__top">
			<header className="mapa__titulo">
				<h2>Top {TOP} no mapa</h2>
				<Link to={`/ranking?mapa=${encodeURIComponent(mapa)}`} className="mapa__ver">ranking <ArrowRight size={13} /></Link>
			</header>
			<Estado resposta={resposta} esqueleto="tabela" textoVazio={`Nenhum jogador com ${MIN_ROUNDS_PADRAO}+ rounds neste mapa.`}>
				{jogadores => (
					<>
						<Tabela linhas={jogadores} colunas={COLUNAS_TOP} chave={j => j.puuid} legenda={`Top ${TOP} jogadores em ${mapa}`} />
						<p className="muted mapa__nota">Por ACS, com {MIN_ROUNDS_PADRAO}+ rounds neste mapa.</p>
					</>
				)}
			</Estado>
		</section>
	)
}

export default Mapa
