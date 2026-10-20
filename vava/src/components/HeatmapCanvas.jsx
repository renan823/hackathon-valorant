import { useEffect, useRef } from 'react'

const RADIUS_RATIO = 0.028 // blob radius as fraction of canvas width

function heatColor(t) {
	// maps [0,1] → blue → cyan → green → yellow → red
	if (t < 0.25) return [0, Math.round(t * 4 * 255), 255]
	if (t < 0.5) return [0, 255, Math.round((1 - (t - 0.25) * 4) * 255)]
	if (t < 0.75) return [Math.round((t - 0.5) * 4 * 255), 255, 0]
	return [255, Math.round((1 - (t - 0.75) * 4) * 255), 0]
}

function renderHeatmap(canvas, points) {
	const { width, height } = canvas;

	if (width <= 0 || height <= 0) return;
	const ctx = canvas.getContext('2d')
	ctx.clearRect(0, 0, width, height)

	if (!points.length) return

	const r = Math.round(width * RADIUS_RATIO)

	// 1. Draw density blobs on a shadow canvas (grayscale alpha accumulation)
	const shadow = document.createElement('canvas')
	shadow.width = width
	shadow.height = height
	const sctx = shadow.getContext('2d')
	sctx.globalCompositeOperation = 'lighter'

	for (const [nx, ny] of points) {
		const x = nx * width
		const y = ny * height
		const g = sctx.createRadialGradient(x, y, 0, x, y, r)
		g.addColorStop(0, 'rgba(255,255,255,0.25)')
		g.addColorStop(1, 'rgba(255,255,255,0)')
		sctx.fillStyle = g
		sctx.beginPath()
		sctx.arc(x, y, r, 0, Math.PI * 2)
		sctx.fill()
	}

	// 2. Read pixel data and map alpha → color
	const src = sctx.getImageData(0, 0, width, height)
	const dst = ctx.createImageData(width, height)
	const sd = src.data
	const dd = dst.data

	// find max intensity for normalization
	let maxAlpha = 0
	for (let i = 3; i < sd.length; i += 4) {
		if (sd[i] > maxAlpha) maxAlpha = sd[i]
	}
	if (maxAlpha === 0) return

	for (let i = 0; i < sd.length; i += 4) {
		const alpha = sd[i + 3]
		if (alpha === 0) continue
		const t = alpha / maxAlpha
		const [r, g, b] = heatColor(t)
		dd[i] = r
		dd[i + 1] = g
		dd[i + 2] = b
		dd[i + 3] = Math.round(t * 210 + 20)
	}

	ctx.putImageData(dst, 0, 0)
}

function HeatmapCanvas({ points, containerRef }) {
	const canvasRef = useRef(null)

	useEffect(() => {
		const canvas = canvasRef.current
		const container = containerRef?.current
		if (!canvas || !container) return

		const resize = () => {
			const { width, height } = container.getBoundingClientRect()
			canvas.width = Math.round(width)
			canvas.height = Math.round(height)
			renderHeatmap(canvas, points)
		}

		resize()
		const ro = new ResizeObserver(resize)
		ro.observe(container)
		return () => ro.disconnect()
	}, [points, containerRef])

	return <canvas ref={canvasRef} className="heatmap-canvas" />
}

export default HeatmapCanvas
