// Props comuns dos gráficos (recharts) no tema escuro (plano, seção 2). As cores vêm dos tokens do
// index.css, lidos já calculados: atributos de SVG não são um lugar confiável para var(--…).
export function cor(token) {
	return getComputedStyle(document.documentElement).getPropertyValue(token).trim()
}

export function eixo() {
	return {
		stroke: cor('--border'),
		tick: { fill: cor('--text-muted'), fontSize: 12 },
		tickLine: false,
	}
}

export function grade() {
	return { stroke: cor('--border'), strokeDasharray: '3 3', vertical: false }
}

// Cursor do tooltip (a linha vertical ou a faixa sob o mouse).
export function cursor() {
	return { stroke: cor('--text-muted'), strokeWidth: 1, fill: cor('--surface2') }
}

// Cor de um valor de série: o slot vem de CORES_SERIE (fixo; um filtro não repinta nada); fora dele, "Outros" (F13).
export function corDaSerie(valor, slots) {
	const slot = slots[valor]
	return slot ? cor(`--serie-${slot}`) : cor('--outros')
}

// Amostra pequena (R8, spec 6.5): menos de 5 partidas. A coluna da amostra é grafico.n quando a análise
// informa; senão, `partidas` ou `partidas_mapa`. Na matriz, `n` tem outro papel (min_n) e não entra aqui.
export const LIMITE_AMOSTRA = 5

export function amostraDe(grafico, linha) {
	const coluna = grafico.n && grafico.tipo !== 'matriz' ? grafico.n
		: 'partidas' in linha ? 'partidas'
		: 'partidas_mapa' in linha ? 'partidas_mapa'
		: null
	return coluna && typeof linha[coluna] === 'number' ? linha[coluna] : null
}

export function amostraPequena(grafico, linha) {
	const n = amostraDe(grafico, linha)
	return n !== null && n < LIMITE_AMOSTRA
}
