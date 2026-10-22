import { formatar, rotulo } from '../formatos'
import { amostraDe, amostraPequena } from './comum'

// Tooltip genérico dos gráficos de análise: mostra as colunas de `campos` que existirem na linha.
// Texto nas cores de texto; a amostra pequena aparece escrita, não só pelo esmaecido.
function Dica({ active, payload, grafico, campos }) {
	if (!active || !payload?.length) return null
	const linha = payload[0].payload
	const visiveis = [...new Set(campos)].filter(c => c && linha[c] !== undefined)
	const pequena = amostraPequena(grafico, linha)

	return (
		<div className="grafico-tooltip">
			{visiveis.map((c, i) => (
				<div key={c}>
					{i === 0
						? <strong>{formatar(c, linha[c])}</strong>
						: <>{rotulo(c)}: <strong>{formatar(c, linha[c])}</strong></>}
				</div>
			))}
			{pequena && <div className="ruim">Amostra pequena (n = {amostraDe(grafico, linha)})</div>}
		</div>
	)
}

export default Dica
