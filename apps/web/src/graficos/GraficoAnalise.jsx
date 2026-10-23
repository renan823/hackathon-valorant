import Tabela from '../components/Tabela'
import AtividadeEconomia from './AtividadeEconomia'
import Barras from './Barras'
import Dispersao from './Dispersao'
import Kpis from './Kpis'
import Linha from './Linha'
import Matriz from './Matriz'
import { amostraPequena } from './comum'
import './graficos.css'

// Tabela de uma análise (também o "ver dados" da tela cheia): as colunas de grafico.colunas (ou todas), com cor por qualidade onde houver limiar.
export function TabelaAnalise({ dados, grafico }) {
	const chaves = grafico.colunas ?? Object.keys(dados[0] ?? {})
	return (
		<Tabela
			linhas={dados}
			colunas={chaves.map(chave => ({ chave, cor: true }))}
			alturaMax={dados.length > 20 ? '480px' : undefined}
			classeLinha={l => (amostraPequena(grafico, l) ? 'linha--amostra-pequena' : undefined)}
		/>
	)
}

// Um componente por grafico.tipo (spec 8). Tipo novo = um arquivo em graficos/ + uma linha aqui.
const GRAFICOS = {
	barras: Barras,
	'atividade-economia': AtividadeEconomia,
	dispersao: Dispersao,
	linha: Linha,
	kpi: Kpis,
	tabela: TabelaAnalise,
	matriz: Matriz,
}

// Renderiza qualquer análise de /api/analises/{id} pelo campo grafico.tipo. Tipo desconhecido vira tabela:
// uma análise nova no backend nunca quebra a página. Sem dados, não desenha nada (o insight explica).
function GraficoAnalise({ analise }) {
	if (!analise.dados?.length) return null
	const Grafico = GRAFICOS[analise.grafico?.tipo] ?? TabelaAnalise
	return <Grafico dados={analise.dados} grafico={analise.grafico ?? {}} />
}

export default GraficoAnalise
