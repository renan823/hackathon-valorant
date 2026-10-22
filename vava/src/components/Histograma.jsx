import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { contagem, formatar, rotulo } from '../formatos'
import { cor, cursor, eixo, grade } from '../graficos/comum'
import '../graficos/graficos.css'
import './Histograma.css'

// Distribuição de uma métrica do ranking (spec 7.2), com as `faixas` de /jogadores/distribuicao.
// Faixas encostadas (2 px de respiro) e uma série só, sem legenda: o título diz a métrica. O rótulo do eixo
// fica no meio da faixa, onde está a barra; a faixa exata aparece no tooltip e na tabela para leitores de tela.
function Histograma({ faixas, metrica }) {
	const dados = faixas.map(f => ({ ...f, meio: (f.inicio + f.fim) / 2 }))
	const faixa = f => `${formatar(metrica, f.inicio)} a ${formatar(metrica, f.fim)}`

	return (
		<div className="histograma">
			<div className="grafico" aria-hidden="true">
				<ResponsiveContainer width="100%" height="100%">
					<BarChart data={dados} barCategoryGap={2} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
						<CartesianGrid {...grade()} />
						<XAxis dataKey="meio" {...eixo()} interval="preserveStartEnd" minTickGap={24} tickFormatter={v => formatar(metrica, v)} />
						<YAxis {...eixo()} width={32} allowDecimals={false} />
						<Tooltip cursor={cursor()} content={<DicaFaixa metrica={metrica} faixa={faixa} />} />
						<Bar dataKey="jogadores" fill={cor('--serie-1')} radius={[4, 4, 0, 0]} isAnimationActive={false} />
					</BarChart>
				</ResponsiveContainer>
			</div>
			<table className="sr-only">
				<caption>Distribuição de {rotulo(metrica)}</caption>
				<thead><tr><th>Faixa</th><th>Jogadores</th><th>%</th><th>% acumulado</th></tr></thead>
				<tbody>
					{faixas.map(f => (
						<tr key={f.inicio}>
							<td>{faixa(f)}</td><td>{f.jogadores}</td><td>{formatar('pct', f.pct)}</td><td>{formatar('pct_acumulado', f.pct_acumulado)}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}

function DicaFaixa({ active, payload, metrica, faixa }) {
	if (!active || !payload?.length) return null
	const f = payload[0].payload
	return (
		<div className="grafico-tooltip">
			<div>{rotulo(metrica)} de <strong>{faixa(f)}</strong></div>
			<div><strong>{contagem(f.jogadores, 'jogador', 'jogadores')}</strong> ({formatar('pct', f.pct)})</div>
			<div className="muted">Acumulado: {formatar('pct_acumulado', f.pct_acumulado)} até {formatar(metrica, f.fim)}</div>
		</div>
	)
}

export default Histograma
