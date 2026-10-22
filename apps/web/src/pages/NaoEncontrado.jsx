import { Link } from 'react-router'
import Busca from '../components/Busca'

// Rota desconhecida ou recurso inexistente (spec 7.9): aviso, busca e link para a Home. Também é o
// errorElement da raiz, por isso não depende do layout: traz o próprio contêiner.
function NaoEncontrado() {
	return (
		<section className="conteudo pagina-aviso">
			<h1>Não encontrado</h1>
			<p className="muted">Essa página não existe ou o endereço está errado. Procure um jogador ou time:</p>
			<div className="pagina-aviso__busca"><Busca /></div>
			<p>
				<Link className="botao" to="/">Voltar para a Home</Link>
			</p>
		</section>
	)
}

export default NaoEncontrado
