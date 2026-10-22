import { NavLink } from 'react-router'
import { useParametro } from '../filtros'
import './Abas.css'

// Abas de uma página (spec 6.4), em dois modos:
//   <Abas itens={[{ rotulo, para }]} />                       → rotas (NavLink)
//   <Abas parametro="categoria" itens={[{ rotulo, valor }]} />  → um parâmetro da URL; o 1º item é o padrão
// Em tela estreita, as abas rolam na horizontal.
function Abas({ itens, parametro }) {
	return (
		<nav className="abas rolagem-x" aria-label="Abas">
			{parametro
				? <AbasPorParametro itens={itens} parametro={parametro} />
				: itens.map(i => (
					// `end`: a aba da rota-índice (ex.: Placar) não fica ativa nas sub-rotas.
					<NavLink key={i.para} to={i.para} end className="abas__item">{i.rotulo}</NavLink>
				))}
		</nav>
	)
}

function AbasPorParametro({ itens, parametro }) {
	const [valor, setValor] = useParametro(parametro, itens[0]?.valor)
	return itens.map(i => (
		<button
			key={i.valor}
			className={`abas__item ${i.valor === valor ? 'active' : ''}`}
			aria-current={i.valor === valor ? 'page' : undefined}
			onClick={() => setValor(i.valor)}
		>
			{i.rotulo}
		</button>
	))
}

export default Abas
