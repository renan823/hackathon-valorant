import { formatar, rotulo } from '../formatos'
import './Matriz.css'

const MAX_POLO = 50   // % máximo do polo na mistura: o texto da célula fica com 5,0:1 ou mais (F15)
const SATURA_EM = 25  // pontos de distância de 50% em que o polo chega ao máximo

// Matriz (spec 8, F15): linhas = valores de `y`, colunas = valores de `x`, na ordem de `grafico.ordem`.
// Cor divergente em torno de 50%: --def (a defesa vence mais) ← --neutro → --atk (o ataque vence mais).
// Célula com n < min_n fica neutra, com "n < 30".
function Matriz({ dados, grafico }) {
	const { x, y, valor, n, ordem, min_n: minN = 0 } = grafico
	const linhas = ordem ?? [...new Set(dados.map(d => d[y]))]
	const colunas = ordem ?? [...new Set(dados.map(d => d[x]))]
	const celula = new Map(dados.map(d => [`${d[y]}|${d[x]}`, d]))

	return (
		<div className="matriz">
			<p className="matriz__eixos muted">
				Linhas: {grafico.rotulo_y ?? rotulo(y)} · Colunas: {grafico.rotulo_x ?? rotulo(x)}
			</p>
			<div className="rolagem-x">
				<table className="matriz__tabela">
					<thead>
						<tr>
							<td className="matriz__canto" aria-hidden="true" />
							{colunas.map(c => <th key={c} scope="col">{formatar(x, c)}</th>)}
						</tr>
					</thead>
					<tbody>
						{linhas.map(l => (
							<tr key={l}>
								<th scope="row">{formatar(y, l)}</th>
								{colunas.map(c => {
									const d = celula.get(`${l}|${c}`)
									if (!d) return <td key={c} className="matriz__vazia">—</td>
									const amostra = n ? d[n] : null
									if (amostra !== null && amostra < minN) {
										return (
											<td key={c} className="matriz__pouca" title={`${amostra} ${rotulo(n).toLowerCase()}`}>
												n &lt; {minN}
											</td>
										)
									}
									return (
										<td key={c} style={{ background: fundo(d[valor]) }} title={amostra !== null ? `${formatar(n, amostra)} ${rotulo(n).toLowerCase()}` : undefined}>
											<span className="matriz__valor">{formatar(valor, d[valor])}</span>
											{amostra !== null && <span className="matriz__n">n = {formatar(n, amostra)}</span>}
										</td>
									)
								})}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	)
}

function fundo(v) {
	if (typeof v !== 'number') return undefined
	const intensidade = Math.min(Math.abs(v - 50) / SATURA_EM, 1) * MAX_POLO
	const polo = v >= 50 ? 'var(--atk)' : 'var(--def)'
	return `color-mix(in oklab, ${polo} ${intensidade.toFixed(1)}%, var(--neutro))`
}

export default Matriz
