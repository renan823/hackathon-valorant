import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import '@fontsource-variable/inter'
import './index.css'
import App from './App.jsx'
import NaoEncontrado from './pages/NaoEncontrado.jsx'
import Analise from './pages/Analise.jsx'
import Analises from './pages/Analises.jsx'
import Home from './pages/Home.jsx'
import Mapa from './pages/Mapa.jsx'
import Mapas from './pages/Mapas.jsx'
import Partidas from './pages/Partidas.jsx'
import Ranking from './pages/ranking/Ranking.jsx'
import RankingJogadores from './pages/ranking/Jogadores.jsx'
import RankingTimes from './pages/ranking/Times.jsx'
import Partida from './pages/partida/Partida.jsx'
import Placar from './pages/partida/Placar.jsx'
import Rounds from './pages/partida/Rounds.jsx'
import HeatmapPartida from './pages/partida/Heatmap.jsx'
import Duelos from './pages/partida/Duelos.jsx'
import Jogador from './pages/jogador/Jogador.jsx'
import Resumo from './pages/jogador/Resumo.jsx'
import PartidasDoJogador from './pages/jogador/Partidas.jsx'
import AgentesDoJogador from './pages/jogador/Agentes.jsx'
import MapasDoJogador from './pages/jogador/Mapas.jsx'
import ArmasDoJogador from './pages/jogador/Armas.jsx'
import HeatmapDoJogador from './pages/jogador/Heatmap.jsx'
import Time from './pages/time/Time.jsx'
import VisaoGeral from './pages/time/VisaoGeral.jsx'
import Elenco from './pages/time/Elenco.jsx'
import MapasDoTime from './pages/time/Mapas.jsx'
import PartidasDoTime from './pages/time/Partidas.jsx'
import Confrontos from './pages/time/Confrontos.jsx'
import HeatmapDoTime from './pages/time/Heatmap.jsx'

// Rotas do plano (3.1).

const router = createBrowserRouter([
	{
		path: '/',
		element: <App />,
		errorElement: <NaoEncontrado />,
		children: [
			{ index: true, element: <Home /> },
			{
				path: 'ranking',
				element: <Ranking />,
				children: [
					{ index: true, element: <RankingJogadores /> },
					{ path: 'times', element: <RankingTimes /> },
				],
			},
			{ path: 'partidas', element: <Partidas /> },
			{
				path: 'partidas/:id',
				element: <Partida />,
				children: [
					{ index: true, element: <Placar /> },
					{ path: 'rounds', element: <Rounds /> },
					{ path: 'heatmap', element: <HeatmapPartida /> },
					{ path: 'duelos', element: <Duelos /> },
				],
			},
			{
				path: 'jogadores/:puuid',
				element: <Jogador />,
				children: [
					{ index: true, element: <Resumo /> },
					{ path: 'partidas', element: <PartidasDoJogador /> },
					{ path: 'agentes', element: <AgentesDoJogador /> },
					{ path: 'mapas', element: <MapasDoJogador /> },
					{ path: 'armas', element: <ArmasDoJogador /> },
					{ path: 'heatmap', element: <HeatmapDoJogador /> },
				],
			},
			{
				path: 'times/:id',
				element: <Time />,
				children: [
					{ index: true, element: <VisaoGeral /> },
					{ path: 'elenco', element: <Elenco /> },
					{ path: 'mapas', element: <MapasDoTime /> },
					{ path: 'partidas', element: <PartidasDoTime /> },
					{ path: 'confrontos', element: <Confrontos /> },
					{ path: 'heatmap', element: <HeatmapDoTime /> },
				],
			},
			{ path: 'analises', element: <Analises /> },
			{ path: 'analises/:id', element: <Analise /> },
			{ path: 'mapas', element: <Mapas /> },
			{ path: 'mapas/:mapa', element: <Mapa /> },
			{ path: '*', element: <NaoEncontrado /> },
		],
	},
])

createRoot(document.getElementById('root')).render(
	<StrictMode>
		<RouterProvider router={router} />
	</StrictMode>,
)
