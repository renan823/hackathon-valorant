import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CORES_SERIE } from '../constants'
import { formatar, rotulo } from '../formatos'
import AvisoAmostra from '../components/AvisoAmostra'
import { amostraDe, amostraPequena, cor, corDaSerie, cursor, eixo, grade } from './comum'
import Dica from './Dica'

const MAX_AGRUPADAS = 4  // barras lado a lado; acima disso, seletor no card (F13)
const MAX_VERTICAIS = 8  // acima disso, barras horizontais (spec 6.6)
const MAX_CARACTERES_LABEL_EIXO = 18

function TickAgrupado({ x, y, payload }) {
	const linhas = String(payload.value).split(' ').reduce((linhas, palavra) => {
		const ultima = linhas.at(-1)
		if (ultima && `${ultima} ${palavra}`.length <= MAX_CARACTERES_LABEL_EIXO) {
			linhas[linhas.length - 1] = `${ultima} ${palavra}`
		} else {
			linhas.push(palavra)
		}
		return linhas
	}, [])

	return (
		<g>
			<text x={x} y={y} textAnchor="middle" fill={cor('--text-muted')} fontSize={12}>
				{linhas.map((linha, indice) => (
					<tspan key={indice} x={x} dy={indice === 0 ? 0 : 14}>{linha}</tspan>
				))}
			</text>
		</g>
	)
}

// Barras de uma análise (spec 8). `serie` tem dois usos:
// - cada barra tem a sua categoria (x único por linha, ex.: meta-armas por categoria_meio): cor da categoria,
//   até 3 coloridas e o resto em "Outros";
// - várias linhas por x (ex.: plant-sites por mapa): até 4 séries lado a lado; mais que isso vira seletor.
function Barras({ dados, grafico }) {
	const { x, y, serie, referencia } = grafico
	const valoresSerie = serie ? [...new Set(dados.map(d => d[serie]))] : []
	const agrupado = serie && new Set(dados.map(d => d[x])).size < dados.length
	const comSeletor = agrupado && valoresSerie.length > MAX_AGRUPADAS
	const [escolhido, setEscolhido] = useState(null)
	const atual = escolhido ?? valoresSerie[0]

	if (agrupado && !comSeletor) return <BarrasAgrupadas dados={dados} grafico={grafico} series={valoresSerie} />

	const linhas = comSeletor ? dados.filter(d => d[serie] === atual) : dados
	const horizontal = linhas.length > MAX_VERTICAIS
	// Um valor só e sem cor fixa (ex.: plant-sites filtrado por um mapa) é uma série só: cor 1, e não "Outros".
	// Com cor fixa (ex.: só Sidearm), a cor continua a do valor (F13).
	const porCategoria = serie && !agrupado && (valoresSerie.length > 1 || valoresSerie.some(v => CORES_SERIE[v]))
	const pequenas = linhas.filter(l => amostraPequena(grafico, l))
	const fmtX = v => formatar(x, v)
	const fmtY = v => formatar(y, v)

	return (
		<div className="grafico-analise">
			{comSeletor && (
				<label className="grafico-analise__seletor">
					<span className="muted">{rotulo(serie)}</span>
					<select className="barra-filtros__select" value={atual} onChange={e => setEscolhido(e.target.value)}>
						{valoresSerie.map(v => <option key={v} value={v}>{v}</option>)}
					</select>
				</label>
			)}
			{grafico.rotulo_y && <p className="grafico-analise__eixo muted">{grafico.rotulo_y}</p>}
			<div className="grafico" style={horizontal ? { height: Math.max(280, linhas.length * 24 + 40) } : undefined}>
				<ResponsiveContainer width="100%" height="100%">
					<BarChart data={linhas} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
						<CartesianGrid {...grade()} horizontal={!horizontal} vertical={horizontal} />
						{horizontal ? (
							<>
								<XAxis type="number" {...eixo()} tickFormatter={fmtY} />
								<YAxis type="category" dataKey={x} {...eixo()} width={120} interval={0} tickFormatter={fmtX} />
							</>
						) : (
							<>
								<XAxis dataKey={x} {...eixo()} interval={0} tickFormatter={fmtX} />
								<YAxis {...eixo()} width={52} tickFormatter={fmtY} />
							</>
						)}
						<Tooltip cursor={cursor()} content={<Dica grafico={grafico} campos={[
							x, serie, y, grafico.n, 'partidas', 'partidas_mapa', 'team_matches',
							'jogador_partidas', 'rounds', 'kills', 'plants', 'abates_habilidade',
						]} />} />
						{referencia !== undefined && (horizontal
							? <ReferenceLine x={referencia} stroke={cor('--text-muted')} strokeDasharray="4 4" />
							: <ReferenceLine y={referencia} stroke={cor('--text-muted')} strokeDasharray="4 4" />)}
						<Bar dataKey={y} radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={48} isAnimationActive={false}>
							{linhas.map((l, i) => (
								<Cell
									key={i}
									fill={porCategoria ? corDaSerie(l[serie], CORES_SERIE) : cor('--serie-1')}
									fillOpacity={amostraPequena(grafico, l) ? 0.35 : 1}
								/>
							))}
						</Bar>
					</BarChart>
				</ResponsiveContainer>
			</div>
			{grafico.rotulo_x && <p className="grafico-analise__eixo grafico-analise__eixo--x muted">{grafico.rotulo_x}</p>}
			{porCategoria && <Legenda itens={legendaPorCategoria([...new Set(linhas.map(l => l[serie]))], serie)} campo={serie} />}
			<AvisoAmostra itens={pequenas.map(l => ({ nome: fmtX(l[x]), n: amostraDe(grafico, l) }))} />
		</div>
	)
}

// Até 4 séries lado a lado: as linhas viram uma por x, com uma coluna por série.
function BarrasAgrupadas({ dados, grafico, series }) {
	const { x, y, serie, referencia } = grafico
	const porX = new Map()
	for (const d of dados) {
		if (!porX.has(d[x])) porX.set(d[x], { [x]: d[x] })
		porX.get(d[x])[d[serie]] = d[y]
	}
	// Sem lugar fixo em CORES_SERIE, o slot segue a ordem alfabética dos valores (estável entre filtros).
	const ordenadas = [...series].sort()
	const corDe = v => (CORES_SERIE[v] ? corDaSerie(v, CORES_SERIE) : cor(`--serie-${ordenadas.indexOf(v) + 1}`))

	return (
		<div className="grafico-analise">
			{grafico.rotulo_y && <p className="grafico-analise__eixo muted">{grafico.rotulo_y}</p>}
			<div className="grafico">
				<ResponsiveContainer width="100%" height="100%">
					<BarChart data={[...porX.values()]} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
						<CartesianGrid {...grade()} />
						<XAxis
							dataKey={x}
							{...eixo()}
							interval={0}
							height={58}
							tick={<TickAgrupado />}
							tickFormatter={v => formatar(x, v)}
						/>
						<YAxis {...eixo()} width={52} tickFormatter={v => formatar(y, v)} />
						<Tooltip cursor={cursor()} content={props => (
							<DicaAgrupada {...props} dados={dados} grafico={grafico} campoX={x} campoSerie={serie} campoY={y} />
						)} />
						{referencia !== undefined && <ReferenceLine y={referencia} stroke={cor('--text-muted')} strokeDasharray="4 4" />}
						{series.map(s => (
							<Bar key={s} dataKey={s} fill={corDe(s)} radius={[4, 4, 0, 0]} isAnimationActive={false}>
								{grafico.rotulo_valor && (
									<LabelList
										dataKey={s}
										position="top"
										formatter={valor => valor == null ? '' : formatar(y, valor)}
										className="grafico-barras__rotulo"
									/>
								)}
							</Bar>
						))}
					</BarChart>
				</ResponsiveContainer>
			</div>
			<Legenda itens={series.map(s => ({ rotulo: formatar(serie, s), cor: corDe(s) }))} campo={serie} />
		</div>
	)
}

function DicaAgrupada({ active, payload, dados, grafico, campoX, campoSerie, campoY }) {
	if (!active || !payload?.length) return null
	const valorX = payload[0].payload[campoX]
	const linhas = dados.filter(linha => linha[campoX] === valorX)
	return (
		<div className="grafico-tooltip">
			<strong>{formatar(campoX, valorX)}</strong>
			{linhas.map(linha => (
				<div key={linha[campoSerie]}>
					<strong>{formatar(campoSerie, linha[campoSerie])}</strong>: {rotulo(campoY)}{' '}
					<strong>{formatar(campoY, linha[campoY])}</strong>
					{grafico.n && linha[grafico.n] !== undefined && (
						<> · {rotulo(grafico.n)}: <strong>{formatar(grafico.n, linha[grafico.n])}</strong></>
					)}
					{(grafico.indicadores ?? []).map(campo => linha[campo] === undefined ? null : (
						<span key={campo}> · {rotulo(campo)}: <strong>{formatar(campo, linha[campo])}</strong></span>
					))}
				</div>
			))}
		</div>
	)
}

// Legenda por categoria: as que têm cor fixa em CORES_SERIE e, se sobrar alguma, "Outros".
function legendaPorCategoria(valores, campo) {
	const fixos = valores.filter(v => CORES_SERIE[v]).sort((a, b) => CORES_SERIE[a] - CORES_SERIE[b])
	const itens = fixos.map(v => ({ rotulo: formatar(campo, v), cor: corDaSerie(v, CORES_SERIE) }))
	if (valores.some(v => !CORES_SERIE[v])) itens.push({ rotulo: 'Outros', cor: cor('--outros') })
	return itens
}

// Legenda sempre que houver 2+ cores (spec 8): quadrado da cor + nome na cor do texto.
function Legenda({ itens, campo }) {
	if (itens.length < 2) return null
	return (
		<ul className="grafico-analise__legenda" aria-label={`Legenda: ${rotulo(campo)}`}>
			{itens.map(i => (
				<li key={i.rotulo}><span className="grafico-analise__cor" style={{ background: i.cor }} />{i.rotulo}</li>
			))}
		</ul>
	)
}

export default Barras
