import { Link } from 'react-router'
import { dividirNick, linkJogador } from '../formatos'
import './Nick.css'

// Nome em destaque + #tag apagado, com link para o perfil (spec 5.4). Nick longo ganha reticências,
// com o nick inteiro no title.
function Nick({ puuid, nick }) {
	const { nome, tag } = dividirNick(nick)
	const conteudo = (
		<>
			<span className="nick__nome">{nome}</span>
			{tag && <span className="nick__tag">#{tag}</span>}
		</>
	)
	if (!puuid) return <span className="nick" title={nick}>{conteudo}</span>
	return <Link className="nick" to={linkJogador(puuid)} title={nick}>{conteudo}</Link>
}

export default Nick
