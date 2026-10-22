import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts'
import { CORES_SERIE } from '../constants'
import { formatar, rotulo } from '../formatos'
import { cor, corDaSerie, eixo, grade } from './comum'
import Dica from './Dica'

// Dispersão de uma análise (spec 8): `x` e `y` numéricos, `serie` opcional. A cor segue o valor pelo slot fixo
// de CORES_SERIE (no máximo 3 coloridas); o resto vai para "Outros" (F13). Um Scatter por grupo, para o
// tooltip e a legenda saírem por grupo.
function Dispersao({ dados, grafico }) {
	const { x, y, serie } = grafico
	const grupos = new Map()
	for (const d of dados) {
		const chave = serie && CORES_SERIE[d[serie]] ? d[serie] : (serie ? 'Outros' : '')
		if (!grupos.has(chave)) grupos.set(chave, [])
		grupos.get(chave).push(d)
	}
	// Coloridos na ordem do slot; "Outros" por último (e por baixo, desenhado primeiro).
	const ordem = [...grupos.keys()].sort((a, b) => (CORES_SERIE[a] ?? 99) - (CORES_SERIE[b] ?? 99))
	const corDe = g => (serie ? corDaSerie(g, CORES_SERIE) : cor('--serie-1'))
	// Coluna de nome para o tooltip: a primeira de texto que não é a série.
	const nome = Object.keys(dados[0] ?? {}).find(c => c !== serie && typeof dados[0][c] === 'string')

	return (
		<div className="grafico-analise">
			{grafico.rotulo_y && <p className="grafico-analise__eixo muted">{grafico.rotulo_y}</p>}
			<div className="grafico">
				<ResponsiveContainer width="100%" height="100%">
					<ScatterChart margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
						<CartesianGrid {...grade()} vertical />
						<XAxis type="number" dataKey={x} name={rotulo(x)} {...eixo()} domain={['auto', 'auto']} tickFormatter={v => formatar(x, v)} />
						<YAxis type="number" dataKey={y} name={rotulo(y)} {...eixo()} width={52} domain={['auto', 'auto']} tickFormatter={v => formatar(y, v)} />
						{/* Área de 100 px² ≈ 11 px de diâmetro: marcador de 8 px ou mais, com o anel de 2 px. */}
						<ZAxis range={[100, 100]} />
						<Tooltip cursor={{ stroke: cor('--text-muted'), strokeDasharray: '3 3' }} content={<Dica grafico={grafico} campos={[nome, serie, x, y, 'partidas', 'partidas_mapa']} />} />
						{[...ordem].reverse().map(g => (
							<Scatter key={g} name={g} data={grupos.get(g)} fill={corDe(g)} stroke={cor('--surface')} strokeWidth={2} shape="circle" isAnimationActive={false} />
						))}
					</ScatterChart>
				</ResponsiveContainer>
			</div>
			{grafico.rotulo_x && <p className="grafico-analise__eixo grafico-analise__eixo--x muted">{grafico.rotulo_x ?? rotulo(x)}</p>}
			{ordem.length > 1 && (
				<ul className="grafico-analise__legenda" aria-label={`Legenda: ${rotulo(serie)}`}>
					{ordem.map(g => <li key={g}><span className="grafico-analise__cor" style={{ background: corDe(g) }} />{g === 'Outros' ? g : formatar(serie, g)}</li>)}
				</ul>
			)}
		</div>
	)
}

export default Dispersao
