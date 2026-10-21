import React, { useMemo, useRef, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

const TEAM_COLORS = {
	Blue: '#3b82f6',
	Red: '#ef4444'
};

const NODE_REL_SIZE = 4

const GRAD_RED = '#dc2626';
const GRAD_GRAY = '#a8a29e';
const GRAD_GREEN = '#84cc16'

export default function MatchGraph({ matchData }) {
	// 1. Criar uma referência para o componente do grafo
	const fgRef = useRef();

	const graphData = useMemo(() => {
		if (!matchData || !matchData.players || !matchData.roundResults) return { nodes: [], links: [] };

		// Dicionário para armazenar o total de kills de cada jogador
		const playerKills = {};
		const playerTeam = {};
		matchData.players.forEach(p => { playerKills[p.puuid] = 0; playerTeam[p.puuid] = p.teamId; });

		const linksMap = {};

		matchData.roundResults.forEach(round => {
			round.playerStats.forEach(stat => {
				stat.kills.forEach(kill => {
					const k = kill.killer;
					const v = kill.victim;

					// Ignora spike/queda (killer = vítima) e teamkills, como em stats.kills
					if (k === v || playerTeam[k] === playerTeam[v]) return;

					// Acumula os abates individuais para calcular o tamanho do nó depois
					if (playerKills[k] !== undefined) {
						playerKills[k] += 1;
					}

					const pairId = [k, v].sort().join('-');
					if (!linksMap[pairId]) {
						const isKFirst = pairId.startsWith(k);
						linksMap[pairId] = {
							source: isKFirst ? k : v,
							target: isKFirst ? v : k,
							sourceKills: 0,
							targetKills: 0,
							totalKills: 0
						};
					}

					if (linksMap[pairId].source === k) {
						linksMap[pairId].sourceKills += 1;
					} else {
						linksMap[pairId].targetKills += 1;
					}
					linksMap[pairId].totalKills += 1;
				});
			});
		});

		// 2. Definir o tamanho do nó (val) com base nas kills
		const nodes = matchData.players.map(p => ({
			id: p.puuid,
			name: p.gameName,
			team: p.teamId,
			// Tamanho Base (1) + Multiplicador pelas Kills (ex: 0.5)
			// Se tiver 10 kills, o tamanho será 1 + 5 = 6.
			val: 1 + (playerKills[p.puuid] * 0.5)
		}));

		return {
			nodes,
			links: Object.values(linksMap)
		};
	}, [matchData]);

	// 3. Efeito para aplicar as forças de repulsão após o grafo ser montado
	useEffect(() => {
		if (fgRef.current) {
			// 'charge' é a força eletrostática dos nós. O padrão é perto de -30.
			// Valores mais negativos empurram os nós para mais longe uns dos outros.
			fgRef.current.d3Force('charge').strength(-300);

			// 'link' define a distância natural/ideal das arestas (molas). O padrão é 30.
			fgRef.current.d3Force('link').distance(80);
		}
	}, []);

	const drawCustomNode = (node, ctx, globalScale) => {
		// 1. Desenha o círculo base do nó
		const radius = Math.sqrt(Math.max(0, node.val || 1)) * NODE_REL_SIZE;

		ctx.beginPath();
		ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);

		// Preenchimento (cor da equipa)
		ctx.fillStyle = TEAM_COLORS[node.team] || '#fff';
		ctx.fill();

		// Borda
		ctx.lineWidth = 1.5 / globalScale;
		ctx.strokeStyle = '#ffffff';
		ctx.stroke();

		// 2. Desenha a Label permanentemente
		const label = node.name;
		const fontSize = 16 / globalScale; // Ajusta o tamanho da fonte consoante o zoom
		ctx.font = `${fontSize}px Sans-Serif`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'top'; // Alinha o topo do texto com a coordenada Y

		// Calcula a posição Y logo abaixo do nó
		const textY = node.y + radius + (3 / globalScale);

		// Cria um contorno preto em redor do texto para garantir legibilidade
		// caso passe por cima das arestas (linhas) do grafo
		ctx.lineWidth = 2 / globalScale;
		ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
		ctx.strokeText(label, node.x, textY);

		// Preenche o interior do texto a branco
		ctx.fillStyle = '#ffffff';
		ctx.fillText(label, node.x, textY);
	};

	const drawCustomLink = (link, ctx) => {
		const start = link.source;
		const end = link.target;

		if (typeof start !== 'object' || typeof end !== 'object') return;

		const total = link.totalKills;
		const advantageRatio = link.sourceKills / total;

		// LÓGICA DE CORES ATUALIZADA
		let startColor, endColor;

		if (link.sourceKills > link.targetKills) {
			// Source tem vantagem
			startColor = GRAD_GREEN;
			endColor = GRAD_RED;
		} else if (link.sourceKills < link.targetKills) {
			// Target tem vantagem
			startColor = GRAD_RED;
			endColor = GRAD_GREEN;
		} else {
			// Empate
			startColor = GRAD_GRAY;
			endColor = GRAD_GRAY;
		}

		ctx.beginPath();
		ctx.moveTo(start.x, start.y);
		ctx.lineTo(end.x, end.y);

		// O gradiente continua a dividir a linha proporcionalmente (advantageRatio)
		const gradient = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
		gradient.addColorStop(0, startColor);
		gradient.addColorStop(advantageRatio, startColor);
		gradient.addColorStop(advantageRatio, endColor);
		gradient.addColorStop(1, endColor);

		ctx.strokeStyle = gradient;
		ctx.lineWidth = 1 + (total * 0.8);
		ctx.stroke();

		// Desenha o placar no meio
		const midX = start.x + (end.x - start.x) / 2;
		const midY = start.y + (end.y - start.y) / 2;
		const scoreText = `${link.sourceKills}x${link.targetKills}`;

		ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
		const textWidth = ctx.measureText(scoreText).width;
		ctx.fillRect(midX - (textWidth / 2) - 1, midY - 2.5, textWidth + 2, 5);

		ctx.font = '6px Sans-Serif';
		ctx.fillStyle = '#ffffff';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(scoreText, midX, midY);
	};

	return (
		<div style={{ width: '100%', height: '100%', minHeight: '600px', backgroundColor: '#111' }}>
			<ForceGraph2D
				ref={fgRef} // <-- Anexando a ref aqui
				graphData={graphData}
				nodeLabel="name"
				nodeColor={node => TEAM_COLORS[node.team] || '#fff'}
				nodeRelSize={NODE_REL_SIZE} // Mantém o tamanho relativo base da biblioteca
				linkCanvasObjectMode={() => 'replace'}
				nodeCanvasObject={drawCustomNode}
				linkCanvasObject={drawCustomLink}
				d3Force
			/>
		</div>
	);
}
