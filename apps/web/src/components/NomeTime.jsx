import { Link } from 'react-router'
import { linkTime } from '../formatos'
import './Nick.css'

// Nome do time com link. Com `equipe` ("a" ou "b"), ganha um marcador na cor --time-a/--time-b;
// o nome fica na cor do texto, porque texto nunca usa cor de série (F12).
function NomeTime({ id, nome, equipe }) {
	return (
		<Link className="nome-time" to={linkTime(id)} title={nome}>
			{equipe && <span className={`nome-time__marcador nome-time__marcador--${equipe}`} aria-hidden="true" />}
			<span className="nome-time__texto">{nome}</span>
		</Link>
	)
}

export default NomeTime
