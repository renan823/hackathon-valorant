import { useEffect, useMemo, useRef, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { dividirNick, equipe } from '../formatos'
import { cor } from '../graficos/comum'
import './GrafoDuelos.css'

const TAMANHO_NO = 4
const ALTURA_MAX = 600

// Grafo de força dos duelos (spec 7.4), adaptado do antigo MatchGraph.jsx para o formato de /duelos.
// Nó: tamanho por kills, cor da equipe. Aresta: dividida na proporção dos abates de cada lado, cada parte na
// cor da equipe que fez aqueles abates (na Partida, cor é sempre time, F12), com o placar do duelo no meio.
// A mesma informação está na matriz, que é a visão acessível; o grafo é complementar.
function GrafoDuelos({ duelos, partida, onArestaClick }) {
	const fgRef = useRef()
	const caixaRef = useRef(null)
	const [tamanho, setTamanho] = useState({ largura: 0, altura: 0 })

	// O force-graph altera os objetos (x, y, vx…): os dados só são recriados quando a resposta muda.
	const dados = useMemo(() => {
		const equipeDe = Object.fromEntries(duelos.nos.map(n => [n.id, equipe(partida, n.time_id)]))
		return {
			nodes: duelos.nos.map(n => ({ id: n.id, nome: dividirNick(n.nick).nome, nick: n.nick, kills: n.kills, equipe: equipeDe[n.id], val: 1 + n.kills * 0.5 })),
			links: duelos.arestas.map(e => ({ source: e.a, target: e.b, killsOrigem: e.kills_a, killsDestino: e.kills_b, total: e.total, equipeOrigem: equipeDe[e.a], equipeDestino: equipeDe[e.b] })),
		}
	}, [duelos, partida])

	// Mede o próprio contêiner: o force-graph precisa de largura e altura explícitas.
	useEffect(() => {
		const caixa = caixaRef.current
		if (!caixa) return
		const medir = () => {
			const largura = Math.round(caixa.getBoundingClientRect().width)
			setTamanho({ largura, altura: Math.min(ALTURA_MAX, Math.round(window.innerHeight * 0.7)) })
		}
		medir()
		const ro = new ResizeObserver(medir)
		ro.observe(caixa)
		return () => ro.disconnect()
	}, [])

	// Repulsão maior e arestas mais longas que o padrão, para os nomes não se sobreporem.
	useEffect(() => {
		const fg = fgRef.current
		if (!fg || !tamanho.largura) return
		fg.d3Force('charge').strength(-300)
		fg.d3Force('link').distance(80)
	}, [tamanho.largura])

	// Enquadra o grafo inteiro no quadro: ao fim da simulação e quando o quadro muda de tamanho.
	const enquadrar = () => fgRef.current?.zoomToFit(300, 40)
	useEffect(() => { enquadrar() }, [tamanho.largura, tamanho.altura])

	const cores = { a: cor('--time-a'), b: cor('--time-b'), texto: cor('--text'), fundo: cor('--surface'), borda: cor('--border') }

	function desenharNo(no, ctx, escala) {
		const raio = Math.sqrt(Math.max(0, no.val)) * TAMANHO_NO
		ctx.beginPath()
		ctx.arc(no.x, no.y, raio, 0, 2 * Math.PI)
		ctx.fillStyle = cores[no.equipe] ?? cores.texto
		ctx.fill()
		ctx.lineWidth = 1.5 / escala
		ctx.strokeStyle = cores.fundo
		ctx.stroke()

		const fonte = 13 / escala
		ctx.font = `600 ${fonte}px 'Inter Variable', system-ui, sans-serif`
		ctx.textAlign = 'center'
		ctx.textBaseline = 'top'
		const y = no.y + raio + 3 / escala
		ctx.lineWidth = 3 / escala
		ctx.strokeStyle = cores.fundo
		ctx.strokeText(no.nome, no.x, y)
		ctx.fillStyle = cores.texto
		ctx.fillText(no.nome, no.x, y)
	}

	function desenharAresta(aresta, ctx, escala) {
		const { source: o, target: d } = aresta
		if (typeof o !== 'object' || typeof d !== 'object') return
		const parte = aresta.total ? aresta.killsOrigem / aresta.total : 0.5
		const gradiente = ctx.createLinearGradient(o.x, o.y, d.x, d.y)
		const corO = cores[aresta.equipeOrigem], corD = cores[aresta.equipeDestino]
		gradiente.addColorStop(0, corO)
		gradiente.addColorStop(parte, corO)
		gradiente.addColorStop(parte, corD)
		gradiente.addColorStop(1, corD)
		ctx.beginPath()
		ctx.moveTo(o.x, o.y)
		ctx.lineTo(d.x, d.y)
		ctx.strokeStyle = gradiente
		ctx.globalAlpha = 0.75
		ctx.lineWidth = (1 + aresta.total * 0.8) / Math.sqrt(escala)
		ctx.stroke()
		ctx.globalAlpha = 1

		// Placar do duelo no meio da aresta.
		const mx = (o.x + d.x) / 2, my = (o.y + d.y) / 2
		// O número de quem está à esquerda vem primeiro: cada número fica do lado do seu jogador.
		const texto = o.x <= d.x ? `${aresta.killsOrigem}×${aresta.killsDestino}` : `${aresta.killsDestino}×${aresta.killsOrigem}`
		const fonte = 10 / escala
		ctx.font = `700 ${fonte}px 'Inter Variable', system-ui, sans-serif`
		const largura = ctx.measureText(texto).width
		ctx.fillStyle = cores.fundo
		ctx.fillRect(mx - largura / 2 - 2 / escala, my - fonte / 2 - 1 / escala, largura + 4 / escala, fonte + 2 / escala)
		ctx.fillStyle = cores.texto
		ctx.textAlign = 'center'
		ctx.textBaseline = 'middle'
		ctx.fillText(texto, mx, my)
	}

	return (
		<div
			ref={caixaRef}
			className="grafo-duelos"
			role="img"
			aria-label="Grafo de duelos; a mesma informação está na matriz"
			data-nos={dados.nodes.length}
			data-arestas={dados.links.length}
		>
			{tamanho.largura > 0 && (
				<ForceGraph2D
					ref={fgRef}
					graphData={dados}
					width={tamanho.largura}
					height={tamanho.altura}
					backgroundColor="rgba(0,0,0,0)"
					nodeRelSize={TAMANHO_NO}
					nodeLabel={n => `${n.nick} · ${n.kills} kills`}
					nodeCanvasObject={desenharNo}
					linkCanvasObjectMode={() => 'replace'}
					linkCanvasObject={desenharAresta}
					linkHoverPrecision={6}
					warmupTicks={120}
					cooldownTicks={0}
					onEngineStop={enquadrar}
					onLinkClick={onArestaClick}
					onLinkHover={aresta => {
						const canvas = caixaRef.current?.querySelector('canvas')
						if (canvas) canvas.style.cursor = aresta ? 'pointer' : 'default'
					}}
				/>
			)}
		</div>
	)
}

export default GrafoDuelos
