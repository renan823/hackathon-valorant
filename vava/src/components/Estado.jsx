import { foraDoAr } from '../api'
import NaoEncontrado from '../pages/NaoEncontrado'
import './Estado.css'

const vazioPadrao = dados => Array.isArray(dados) && dados.length === 0

// Carregando, erro e vazio de um bloco que depende da API (spec 6.5):
//   <Estado resposta={useApi(...)}>{dados => …}</Estado>
// `vazio(dados)` diz quando não há o que mostrar (padrão: lista vazia); `esqueleto` dá a forma do
// carregamento ("tabela", "grafico" ou "bloco").
function Estado({ resposta, vazio = vazioPadrao, textoVazio = 'Nada encontrado para estes filtros.', esqueleto = 'bloco', children }) {
	const { dados, erro, carregando, recarregar } = resposta

	if (erro) {
		if (erro.status === 404) return <NaoEncontrado />
		return (
			<div className="estado estado--erro" role="alert">
				<p>
					{foraDoAr(erro)
						? 'Não foi possível falar com o backend.'
						: `Erro ${erro.status}: ${erro.mensagem}`}
				</p>
				<button className="botao" onClick={recarregar}>Tentar de novo</button>
			</div>
		)
	}

	if (carregando) return <Esqueleto tipo={esqueleto} />

	if (vazio(dados)) return <p className="estado estado--vazio muted">{textoVazio}</p>

	return children(dados)
}

function Esqueleto({ tipo }) {
	return (
		<div className={`estado esqueleto esqueleto--${tipo}`} aria-busy="true" aria-label="Carregando">
			{tipo === 'tabela' && Array.from({ length: 6 }, (_, i) => <div key={i} className="esqueleto__linha" />)}
			{tipo === 'grafico' && <div className="esqueleto__area" />}
			{tipo === 'bloco' && <><div className="esqueleto__linha" /><div className="esqueleto__linha esqueleto__linha--curta" /></>}
		</div>
	)
}

export default Estado
