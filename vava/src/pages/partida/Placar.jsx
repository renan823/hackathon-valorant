import { useParams } from 'react-router'
import { useApi } from '../../api'
import { linkJogador } from '../../formatos'
import BarraRounds from '../../components/BarraRounds'
import Estado from '../../components/Estado'
import Nick from '../../components/Nick'
import NomeTime from '../../components/NomeTime'
import SeloAgente from '../../components/SeloAgente'
import Tabela from '../../components/Tabela'
import './Placar.css'

// Aba Placar (spec 7.4): uma tabela por time, ordenada por ACS. Usa a mesma resposta do layout (cache).
function Placar() {
	const { id } = useParams()
	const resposta = useApi(`partidas/${id}`)
	// A barra compacta (só leitura) aparece quando os rounds chegam; não atrasa o placar.
	const { dados: rounds } = useApi(`partidas/${id}/rounds`)

	return (
		<Estado resposta={resposta} vazio={() => false} esqueleto="tabela">
			{({ partida, times }) => (
				<div className="placar">
					{rounds && <div className="card placar__rounds"><BarraRounds rounds={rounds} partida={partida} compacta /></div>}
					{times.map((time, i) => (
						<TabelaDoTime key={time.id} time={time} equipe={i === 0 ? 'a' : 'b'} mvp={partida.mvp?.puuid} />
					))}
				</div>
			)}
		</Estado>
	)
}

function TabelaDoTime({ time, equipe, mvp }) {
	const colunas = [
		{
			chave: 'nick',
			// O link fica na célula (linha clicável); o Nick vai sem link para não aninhar <a>.
			link: j => linkJogador(j.puuid),
			formato: (_, j) => (
				<span className="placar__jogador">
					<SeloAgente agente={j.agente} />
					<Nick nick={j.nick} />
					{j.puuid === mvp && <span className="placar__mvp">MVP</span>}
				</span>
			),
		},
		{ chave: 'kills' }, { chave: 'deaths' }, { chave: 'assists' },
		{ chave: 'mais_menos', cor: true },
		{ chave: 'acs', cor: true }, { chave: 'adr', cor: true },
		{ chave: 'kast_pct', cor: true }, { chave: 'hs_pct', cor: true },
		{ chave: 'first_kills' }, { chave: 'first_deaths' }, { chave: 'multikills' },
	]

	return (
		<section className="placar__time">
			<header className="placar__cabecalho">
				<h2><NomeTime id={time.id} nome={time.nome} equipe={equipe} /></h2>
				<span className={`placar__resultado ${time.venceu ? 'bom' : 'ruim'}`}>{time.venceu ? 'Vitória' : 'Derrota'}</span>
				<span className="muted numero placar__resumo">
					Rounds ATK {time.atk_rounds} · DEF {time.def_rounds} · Pistols {time.pistols} · First kills {time.first_kills}
				</span>
			</header>
			<Tabela
				linhas={time.jogadores}
				colunas={colunas}
				chave={j => j.puuid}
				ordenacaoInicial={{ coluna: 'acs', ordem: 'desc' }}
				legenda={`Placar de ${time.nome}`}
			/>
		</section>
	)
}

export default Placar
