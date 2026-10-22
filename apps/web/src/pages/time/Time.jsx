import { Outlet, useParams } from 'react-router'
import { useApi } from '../../api'
import { corQualidade, formatar, linkTime } from '../../formatos'
import Abas from '../../components/Abas'
import Estado from '../../components/Estado'
import StatTile from '../../components/StatTile'
import './Time.css'

const TILES = ['atk_win_pct', 'def_win_pct', 'pistol_win_pct']

// Layout do time (spec 7.6): cabeçalho, tiles e abas. As abas usam a mesma resposta (cache).
function Time() {
	const { id } = useParams()
	const resposta = useApi(`times/${id}`)

	return (
		<Estado resposta={resposta} vazio={() => false}>
			{perfil => (
				<article className="conteudo time">
					<Cabecalho perfil={perfil} />
					<div className="time__tiles">
						{TILES.map(c => <StatTile key={c} coluna={c} valor={perfil.resumo[c]} />)}
					</div>
					<Abas itens={[
						{ rotulo: 'Visão geral', para: linkTime(id) },
						{ rotulo: 'Elenco', para: `${linkTime(id)}/elenco` },
						{ rotulo: 'Mapas', para: `${linkTime(id)}/mapas` },
						{ rotulo: 'Partidas', para: `${linkTime(id)}/partidas` },
						{ rotulo: 'Confrontos', para: `${linkTime(id)}/confrontos` },
						{ rotulo: 'Heatmap', para: `${linkTime(id)}/heatmap` },
					]} />
					<Outlet />
				</article>
			)}
		</Estado>
	)
}

function Cabecalho({ perfil }) {
	const { resumo } = perfil
	const saldo = resumo.saldo_rounds

	return (
		<header className="time__cabecalho">
			<div className="time__identidade">
				<h1 className="time__nome">{perfil.nome}</h1>
				<p className="time__torneios muted">{perfil.torneios.join(' · ')}</p>
			</div>

			<dl className="time__campanha">
				<div>
					<dt>Campanha</dt>
					<dd className="numero">{resumo.vitorias}V <span className="muted">–</span> {resumo.derrotas}D</dd>
				</div>
				<div>
					<dt>Win%</dt>
					<dd className={`numero ${corQualidade('win_pct', resumo.win_pct) ?? ''}`}>{formatar('win_pct', resumo.win_pct)}</dd>
				</div>
				<div>
					<dt>Saldo de rounds</dt>
					<dd className="numero">
						<span className={corQualidade('saldo_rounds', saldo) ?? ''}>{formatar('saldo_rounds', saldo)}</span>{' '}
						<span className="time__rounds muted">({resumo.rounds_ganhos}–{resumo.rounds_perdidos})</span>
					</dd>
				</div>
			</dl>
		</header>
	)
}

export default Time
