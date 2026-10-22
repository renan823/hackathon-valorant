import { Link } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { useApi } from '../api'
import { formatar, linkAnalise } from '../formatos'
import GraficoAnalise, { TabelaAnalise } from '../graficos/GraficoAnalise'
import { useParametro } from '../filtros'
import Estado from './Estado'
import './CartaoAnalise.css'

// Card de uma análise (spec 7.7): título, insight em destaque, gráfico e descrição recolhível.
// Busca a própria análise com os filtros recebidos. `completo` é a versão de tela cheia: título como h1,
// KPI em destaque e sem o link "abrir". Usado em Análises, Análise e Mapa.
function CartaoAnalise({ id, filtros, completo = false }) {
	const resposta = useApi(`analises/${id}`, filtros)
	// Tela cheia: "ver dados" troca o gráfico por todas as colunas de `dados` (fica na URL).
	const [ver, setVer] = useParametro('ver', 'grafico')
	const tabela = completo && ver === 'dados'

	// "abrir" leva os filtros com que o card foi buscado (no Mapa, o mapa da rota; não os do heatmap).
	const busca = new URLSearchParams()
	for (const [nome, valores] of Object.entries(filtros ?? {})) {
		for (const v of [valores].flat()) if (v) busca.append(nome, v)
	}
	const destino = linkAnalise(id) + (busca.size ? `?${busca}` : '')

	return (
		<article className={`card cartao-analise ${completo ? 'cartao-analise--completo' : ''}`}>
			<Estado resposta={resposta} vazio={() => false} esqueleto="grafico">
				{a => {
					const Titulo = completo ? 'h1' : 'h2'
					return (
						<>
							<header className="cartao-analise__cabecalho">
								<Titulo className="cartao-analise__titulo">{a.titulo}</Titulo>
								{!completo && <Link to={destino} className="cartao-analise__abrir">abrir <ArrowRight size={14} /></Link>}
							</header>
							{completo && a.kpi && (
								<p className="cartao-analise__kpi">
									<strong>{a.kpi.unidade === '%' ? formatar('pct', a.kpi.valor) : formatar('valor', a.kpi.valor)}</strong>
									<span>{a.kpi.titulo}</span>
								</p>
							)}
							{a.insight && <p className="cartao-analise__insight">{a.insight}</p>}
							{completo && a.dados?.length > 0 && (
								<div className="cartao-analise__alternar" role="group" aria-label="Visualização">
									<button className={`chip ${!tabela ? 'chip--ativo' : ''}`} aria-pressed={!tabela} onClick={() => setVer('grafico')}>Gráfico</button>
									<button className={`chip ${tabela ? 'chip--ativo' : ''}`} aria-pressed={tabela} onClick={() => setVer('dados')}>Ver dados ({a.dados.length})</button>
								</div>
							)}
							{tabela ? <TabelaAnalise dados={a.dados} grafico={{ ...a.grafico, colunas: undefined }} /> : <GraficoAnalise analise={a} />}
							{a.descricao && (
								<details className="cartao-analise__descricao" open={completo}>
									<summary>Sobre esta análise</summary>
									<p className="muted">{a.descricao}</p>
								</details>
							)}
						</>
					)
				}}
			</Estado>
		</article>
	)
}

export default CartaoAnalise
