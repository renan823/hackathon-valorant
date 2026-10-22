import { Link } from 'react-router'

// Rota desconhecida ou recurso inexistente (spec 7.9). Também é o errorElement da raiz,
// por isso não depende do layout: traz o próprio contêiner. A busca entra na T2.3a.
function NaoEncontrado() {
	return (
		<section className="conteudo pagina-aviso">
			<h1>Não encontrado</h1>
			<p className="muted">Essa página não existe ou o endereço está errado.</p>
			<p>
				<Link className="botao" to="/">Voltar para a Home</Link>
			</p>
		</section>
	)
}

export default NaoEncontrado
