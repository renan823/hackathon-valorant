import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatar } from '../formatos'
import { cor, cursor, eixo, grade } from './comum'
import Dica from './Dica'

// Linha de uma análise (spec 8): x e y numéricos, com linha de referência opcional (ex.: 50%).
function Linha({ dados, grafico }) {
	const { x, y, referencia } = grafico
	const linhas = [...dados].sort((a, b) => a[x] - b[x])

	return (
		<div className="grafico-analise">
			{grafico.rotulo_y && <p className="grafico-analise__eixo muted">{grafico.rotulo_y}</p>}
			<div className="grafico">
				<ResponsiveContainer width="100%" height="100%">
					<LineChart data={linhas} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
						<CartesianGrid {...grade()} />
						{/* domain auto + nice: marcas redondas (−20.000, −10.000, 0…) em vez dos extremos dos dados. */}
						<XAxis type="number" dataKey={x} domain={['auto', 'auto']} nice {...eixo()} tickFormatter={v => formatar(x, v)} />
						<YAxis {...eixo()} width={52} tickFormatter={v => formatar(y, v)} />
						<Tooltip cursor={cursor()} content={<Dica grafico={grafico} campos={['faixa', y, x, 'rounds', 'partidas']} />} />
						{referencia !== undefined && <ReferenceLine y={referencia} stroke={cor('--text-muted')} strokeDasharray="4 4" />}
						<Line
							type="monotone"
							dataKey={y}
							stroke={cor('--serie-1')}
							strokeWidth={2}
							dot={{ r: 4, fill: cor('--serie-1'), stroke: cor('--surface'), strokeWidth: 2 }}
							isAnimationActive={false}
						/>
					</LineChart>
				</ResponsiveContainer>
			</div>
			{grafico.rotulo_x && <p className="grafico-analise__eixo grafico-analise__eixo--x muted">{grafico.rotulo_x}</p>}
		</div>
	)
}

export default Linha
