import { Outlet, useParams } from 'react-router'
import { useApi } from '../../api'
import { MAP_IMAGES } from '../../constants'
import { formatar, formatarData, linkPartida } from '../../formatos'
import Abas from '../../components/Abas'
import Estado from '../../components/Estado'
import NomeTime from '../../components/NomeTime'
import './Partida.css'

// Layout da partida (spec 7.4): cabeçalho com placar e as abas. Cada aba busca o próprio sub-recurso;
// a aba Placar usa a mesma resposta deste layout, que vem do cache (plano, seção 2).
function Partida() {
	const { id } = useParams()
	const resposta = useApi(`partidas/${id}`)

	return (
		<Estado resposta={resposta} vazio={() => false}>
			{({ partida, times }) => (
				<article className="partida">
					<Cabecalho partida={partida} times={times} />
					<div className="conteudo partida__corpo">
						<Abas itens={[
							{ rotulo: 'Placar', para: linkPartida(id) },
							{ rotulo: 'Rounds', para: `${linkPartida(id)}/rounds` },
							{ rotulo: 'Heatmap', para: `${linkPartida(id)}/heatmap` },
							{ rotulo: 'Duelos', para: `${linkPartida(id)}/duelos` },
						]} />
						<Outlet />
					</div>
				</article>
			)}
		</Estado>
	)
}

function Cabecalho({ partida, times }) {
	const imagem = MAP_IMAGES[partida.mapa.toLowerCase()]
	const [a, b] = times
	const meta = [
		partida.torneio, partida.fase, partida.codigo, formatarData(partida.data), partida.mapa,
		`${partida.n_rounds} rounds`, formatar('duracao_min', partida.duracao_min),
	]

	return (
		<header className="partida__cabecalho" style={imagem ? { '--imagem-mapa': `url(${imagem})` } : undefined}>
			<div className="conteudo">
				<p className="partida__meta muted">{meta.join(' · ')}</p>
				<div className="partida__placar">
					<Lado time={a} equipe="a" />
					<div className="partida__numeros numero" aria-label={`${a.placar} a ${b.placar}`}>
						<span className={a.venceu ? '' : 'muted'}>{a.placar}</span>
						<span className="muted">×</span>
						<span className={b.venceu ? '' : 'muted'}>{b.placar}</span>
					</div>
					<Lado time={b} equipe="b" />
				</div>
			</div>
		</header>
	)
}

// Nome do time (com o marcador da equipe) e os rounds ganhos em cada lado. O lado vira texto, nunca cor (F12).
function Lado({ time, equipe }) {
	return (
		<div className={`partida__time partida__time--${equipe} ${time.venceu ? 'partida__time--vencedor' : ''}`}>
			<span className="partida__nome"><NomeTime id={time.id} nome={time.nome} equipe={equipe} /></span>
			<span className="partida__lados muted numero">
				ATK {time.atk_rounds} · DEF {time.def_rounds} · pistols {time.pistols}
			</span>
		</div>
	)
}

export default Partida
