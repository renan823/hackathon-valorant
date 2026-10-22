import { Link } from 'react-router'
import { MAP_IMAGES } from '../constants'
import { formatar, formatarData, linkPartida } from '../formatos'
import Nick from './Nick'
import NomeTime from './NomeTime'
import './LinhaPartida.css'

// Uma partida no formato `Partida` da API (spec 6.4). A linha toda abre a partida (link estendido
// por CSS); nomes de time e o MVP continuam clicáveis por cima. Com `timeId`, destaca esse time e
// mostra V ou D.
function LinhaPartida({ partida, timeId }) {
	const { time_a: a, time_b: b, vencedor_id: vencedor } = partida
	const doTime = timeId && (a.id === timeId || b.id === timeId)
	const venceu = doTime && vencedor === timeId

	const lado = (t, classe) => (
		<span className={`linha-partida__time linha-partida__time--${classe} ${t.id === vencedor ? 'linha-partida__time--vencedor' : ''} ${t.id === timeId ? 'linha-partida__time--destaque' : ''}`}>
			<NomeTime id={t.id} nome={t.nome} />
		</span>
	)

	return (
		<div className={`linha-partida ${doTime ? (venceu ? 'linha-partida--vitoria' : 'linha-partida--derrota') : ''}`}>
			<div className="linha-partida__mapa">
				<img src={MAP_IMAGES[partida.mapa.toLowerCase()]} alt="" loading="lazy" />
				<span>{partida.mapa}</span>
			</div>

			<div className="linha-partida__info">
				<Link className="linha-partida__link" to={linkPartida(partida.match_id)}>
					{formatarData(partida.data)}
				</Link>
				<span className="muted">{partida.torneio} · {partida.fase} · {partida.codigo}</span>
			</div>

			<div className="linha-partida__placar">
				{lado(a, 'a')}
				<span className="linha-partida__numeros numero">
					<span className={a.id === vencedor ? '' : 'muted'}>{a.placar}</span>
					<span className="muted"> × </span>
					<span className={b.id === vencedor ? '' : 'muted'}>{b.placar}</span>
				</span>
				{lado(b, 'b')}
			</div>

			<div className="linha-partida__extra">
				{partida.mvp && (
					<span className="linha-partida__mvp">
						<span className="muted">MVP</span> <Nick puuid={partida.mvp.puuid} nick={partida.mvp.nick} />{' '}
						<span className="numero muted">{formatar('acs', partida.mvp.acs)}</span>
					</span>
				)}
				<span className="muted numero">{formatar('duracao_min', partida.duracao_min)}</span>
				{doTime && <span className={`linha-partida__resultado ${venceu ? 'bom' : 'ruim'}`}>{venceu ? 'V' : 'D'}</span>}
			</div>
		</div>
	)
}

export default LinhaPartida
