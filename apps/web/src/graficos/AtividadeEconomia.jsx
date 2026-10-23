import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatar, rotulo } from '../formatos'
import { cor, cursor, eixo, grade } from './comum'
import Dica from './Dica'

const METRICAS = {
	jogador_partidas: { rotulo: 'Frequência', eixo: 'Jogador-partidas por faixa de casts/round' },
	win_pct: { rotulo: 'Win rate', eixo: 'Jogador-partidas vencidas (%)' },
}

function AtividadeEconomia({ dados, grafico }) {
	const disponiveis = (grafico.metricas ?? []).filter(metrica => METRICAS[metrica])
	const [selecionada, setSelecionada] = useState(disponiveis[0] ?? 'jogador_partidas')
	const metrica = disponiveis.includes(selecionada)
		? selecionada
		: (disponiveis[0] ?? 'jogador_partidas')
	const nomeEixo = METRICAS[metrica].eixo

	return (
		<div className="grafico-analise">
			<div className="grafico-analise__alternar" role="group" aria-label="Métrica do gráfico">
				{disponiveis.map(chave => (
					<button
						key={chave}
						type="button"
						className={`chip ${metrica === chave ? 'chip--ativo' : ''}`}
						aria-pressed={metrica === chave}
						onClick={() => setSelecionada(chave)}
					>
						{METRICAS[chave].rotulo}
					</button>
				))}
			</div>
			<p className="grafico-analise__eixo muted">{nomeEixo}</p>
			<div className="grafico">
				<ResponsiveContainer width="100%" height="100%">
					<BarChart
						data={dados}
						margin={{ top: 8, right: 16, bottom: 12, left: 0 }}
					>
						<CartesianGrid {...grade()} />
						<XAxis dataKey={grafico.x} {...eixo()} interval={0} />
						<YAxis {...eixo()} width={64} tickFormatter={valor => formatar(metrica, valor)} />
						<Tooltip
							cursor={cursor()}
							content={<Dica grafico={grafico} campos={[
								grafico.x, grafico.n, 'win_pct', 'loadout_medio',
							]} />}
						/>
						<Bar
							dataKey={metrica}
							name={rotulo(metrica)}
							fill={cor('--serie-1')}
							radius={[4, 4, 0, 0]}
							maxBarSize={42}
							isAnimationActive={false}
						/>
					</BarChart>
				</ResponsiveContainer>
			</div>
			<p className="grafico-analise__eixo muted">
				Faixas com menos de 30 jogador-partidas têm win rate instável; use a frequência como contexto.
			</p>
		</div>
	)
}

export default AtividadeEconomia
