import { equipe, formatar } from '../formatos'
import IconeArma from './IconeArma'
import Nick from './Nick'
import './EventoAbate.css'

// Marcador da equipe (--time-a/--time-b) ao lado de um nome; o nome fica na cor do texto (F12).
export function Marcador({ partida, timeId }) {
	const e = equipe(partida, timeId)
	return e ? <span className={`marcador-equipe marcador-equipe--${e}`} aria-hidden="true" /> : null
}

// Uma linha do kill feed. Registros que não são abate (valido: false) aparecem pelo que aconteceram:
// morte para a Spike, queda ou teamkill (spec 7.4).
function EventoAbate({ a, partida }) {
	const vitima = <><Marcador partida={partida} timeId={a.vitima.time_id} /><Nick puuid={a.vitima.puuid} nick={a.vitima.nick} /></>
	if (!a.valido) {
		if (a.categoria_meio === 'Bomb') return <span className="evento-abate">{vitima} <span className="muted">morreu para a Spike</span></span>
		if (a.categoria_meio === 'Fall') return <span className="evento-abate">{vitima} <span className="muted">caiu (queda)</span></span>
		if (a.killer.puuid === a.vitima.puuid) return <span className="evento-abate">{vitima} <span className="muted">morreu ({formatar('categoria_meio', a.categoria_meio)})</span></span>
		return (
			<span className="evento-abate">
				<Marcador partida={partida} timeId={a.killer.time_id} /><Nick puuid={a.killer.puuid} nick={a.killer.nick} />
				<span className="muted">teamkill em</span> {vitima}
			</span>
		)
	}
	return (
		<span className="evento-abate">
			<Marcador partida={partida} timeId={a.killer.time_id} /><Nick puuid={a.killer.puuid} nick={a.killer.nick} />
			<span className="evento-abate__meio muted"><IconeArma meio={a.meio} categoria={a.categoria_meio} /></span>
			{vitima}
			{a.assistencias > 0 && <span className="muted numero"> +{a.assistencias}</span>}
		</span>
	)
}

export default EventoAbate
