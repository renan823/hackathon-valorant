import { TriangleAlert } from 'lucide-react'
import { contagem } from '../formatos'
import './AvisoAmostra.css'

// Selo de amostra pequena (R8 do backend, spec 6.5), em duas formas:
//   <AvisoAmostra itens={[{ nome, n }]} />  → lista, para um gráfico ou tabela com várias linhas
//   <AvisoAmostra n={3} />                  → curta, dentro do card do próprio item
function AvisoAmostra({ itens, n }) {
	if (n !== undefined) {
		return (
			<p className="aviso-amostra" title="Menos de 5 partidas: os números ainda variam muito">
				<TriangleAlert size={14} aria-hidden="true" />
				<span>Amostra pequena: {contagem(n, 'partida')}</span>
			</p>
		)
	}
	if (!itens?.length) return null
	return (
		<p className="aviso-amostra">
			<TriangleAlert size={14} aria-hidden="true" />
			<span>
				Amostra pequena (menos de 5 partidas):{' '}
				{itens.map((i, k) => <span key={i.nome}>{k > 0 && ', '}<strong>{i.nome}</strong> ({i.n})</span>)}
			</span>
		</p>
	)
}

export default AvisoAmostra
