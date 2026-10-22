import { useEffect, useMemo, useRef } from 'react'
import { RAMPA_CALOR } from '../constants'

const GRADE = 512           // resolução da grade de densidade, independente do tamanho na tela
const RAIO = 0.028          // raio de cada ponto, em fração da largura do mapa
const DPR_MAX = 2           // telas de alta densidade: até 2× (spec 9)

// Kernel gaussiano pré-calculado: o "carimbo" somado em cada ponto (spec 9). Somar números com casas
// decimais numa grade, em vez de acumular o alfa de 8 bits do canvas, não satura com milhares de pontos.
const raio = Math.round(GRADE * RAIO)
const KERNEL = (() => {
	const lado = raio * 2 + 1
	const k = new Float32Array(lado * lado)
	const sigma = raio / 2
	for (let dy = -raio; dy <= raio; dy++) {
		for (let dx = -raio; dx <= raio; dx++) {
			const d2 = dx * dx + dy * dy
			if (d2 <= raio * raio) k[(dy + raio) * lado + dx + raio] = Math.exp(-d2 / (2 * sigma * sigma))
		}
	}
	return k
})()

const PARADAS = RAMPA_CALOR.map(h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)))

// t ∈ [0,1] → cor da rampa de um tom (F14), interpolando entre as paradas.
function heatColor(t) {
	const pos = Math.min(Math.max(t, 0), 1) * (PARADAS.length - 1)
	const i = Math.min(Math.floor(pos), PARADAS.length - 2)
	const f = pos - i
	return PARADAS[i].map((c, k) => Math.round(c + (PARADAS[i + 1][k] - c) * f))
}

// Densidade → imagem GRADE×GRADE (offscreen). Só roda quando os pontos mudam.
function montarImagem(pontos) {
	if (import.meta.env.DEV) performance.mark('mapa-calor-inicio')
	const densidade = new Float32Array(GRADE * GRADE)
	const lado = raio * 2 + 1
	for (const p of pontos) {
		const nx = Array.isArray(p) ? p[0] : p.x, ny = Array.isArray(p) ? p[1] : p.y
		const cx = Math.round(nx * (GRADE - 1)), cy = Math.round(ny * (GRADE - 1))
		for (let dy = -raio; dy <= raio; dy++) {
			const y = cy + dy
			if (y < 0 || y >= GRADE) continue
			const linha = y * GRADE, base = (dy + raio) * lado + raio
			for (let dx = -raio; dx <= raio; dx++) {
				const x = cx + dx
				if (x >= 0 && x < GRADE) densidade[linha + x] += KERNEL[base + dx]
			}
		}
	}

	let max = 0
	for (let i = 0; i < densidade.length; i++) if (densidade[i] > max) max = densidade[i]

	const imagem = new ImageData(GRADE, GRADE)
	if (max > 0) {
		const px = imagem.data
		for (let i = 0; i < densidade.length; i++) {
			if (densidade[i] <= 0.01) continue
			// Raiz: com milhares de pontos, o maior foco não apaga o resto do mapa.
			const t = Math.sqrt(densidade[i] / max)
			const [r, g, b] = heatColor(t)
			px[i * 4] = r; px[i * 4 + 1] = g; px[i * 4 + 2] = b
			px[i * 4 + 3] = Math.round((0.15 + 0.75 * t) * 255) // mais claro e mais opaco = mais eventos
		}
	}
	const tela = document.createElement('canvas')
	tela.width = tela.height = GRADE
	tela.getContext('2d').putImageData(imagem, 0, 0)

	if (import.meta.env.DEV) performance.measure('mapa-calor', 'mapa-calor-inicio')
	return tela
}

// Canvas do calor sobre o minimapa. `pontos`: [x, y] ou { x, y } (formato da API) em [0,1] (x → direita,
// y → baixo). A densidade só é recalculada quando a lista muda: passe uma lista estável (a do cache ou um
// useMemo). Ocupa o pai inteiro; ao redimensionar, só redesenha a imagem pronta, no máximo uma vez por quadro.
function HeatmapCanvas({ pontos }) {
	const canvasRef = useRef(null)
	const imagem = useMemo(() => montarImagem(pontos), [pontos])

	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) return
		let quadro = 0

		const desenhar = () => {
			quadro = 0
			const { width, height } = canvas.getBoundingClientRect()
			const dpr = Math.min(window.devicePixelRatio || 1, DPR_MAX)
			canvas.width = Math.max(1, Math.round(width * dpr))
			canvas.height = Math.max(1, Math.round(height * dpr))
			const ctx = canvas.getContext('2d')
			ctx.clearRect(0, 0, canvas.width, canvas.height)
			ctx.imageSmoothingEnabled = true
			ctx.imageSmoothingQuality = 'high'
			ctx.drawImage(imagem, 0, 0, canvas.width, canvas.height)
		}
		const agendar = () => { if (!quadro) quadro = requestAnimationFrame(desenhar) }

		desenhar()
		const ro = new ResizeObserver(agendar)
		ro.observe(canvas)
		return () => { ro.disconnect(); cancelAnimationFrame(quadro) }
	}, [imagem])

	return <canvas ref={canvasRef} className="mapa-calor__canvas" aria-hidden="true" />
}

export default HeatmapCanvas
