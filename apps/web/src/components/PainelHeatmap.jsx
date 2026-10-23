import { useApi } from '../api'
import { LADOS } from '../constants'
import { useFiltros, useParametros } from '../filtros'
import BarraFiltros from './BarraFiltros'
import Estado from './Estado'
import MapaCalor from './MapaCalor'
import './PainelHeatmap.css'

const TIPOS = {
	kills: 'Kills',
	mortes: 'Mortes',
	plants: 'Plants',
	ability_kills: 'Abates por habilidade',
	postplant_ability_kills: 'Abates pós-plant',
	ability_deaths: 'Vítimas de abates por habilidade',
	postplant_ability_deaths: 'Mortes pós-plant',
}
const DESCRICOES = {
	ability_kills: 'Posições dos killers quando finalizaram um abate válido por habilidade; não representa o local de uso do utilitário.',
	postplant_ability_kills: 'Posições dos killers em todos os abates válidos ocorridos após o plant.',
	ability_deaths: 'Posições das vítimas em abates válidos finalizados por habilidade; não representa o local de uso do utilitário.',
	postplant_ability_deaths: 'Posições das vítimas em todos os abates válidos ocorridos após o plant.',
}

// Explorador de heatmap (spec 7.5, 7.6 e 7.8) em volta do /api/heatmap:
// - `mapas`: os mapas que dá para escolher;
// - `filtro`: parâmetros fixos, de quem são as ações ({ jogador: puuid }, { time: id } ou nada);
// - `jogadores`: lista opcional de { puuid, nick } para habilitar filtro por jogador;
// - `tipos`: subconjunto de kills, mortes, plants, abates por habilidade e abates pós-plant;
//   `campos`: os filtros comuns da BarraFiltros.
function PainelHeatmap({
	mapas,
	filtro = {},
	jogadores,
	tipos = [
		'kills', 'mortes', 'ability_kills', 'ability_deaths',
		'postplant_ability_kills', 'postplant_ability_deaths',
	],
	campos = ['torneio', 'fase'],
}) {
	const { filtros } = useFiltros()
	const [f, setF] = useParametros({ mapa: mapas[0], tipo: tipos[0], lado: '', jogador: '' })

	// Jogador ativo (definido via prop `filtro` ou selecionado no dropdown `f.jogador`)
	const jogadorAtivo = filtro.jogador || f.jogador

	// Busca as opções de filtros válidas considerando o jogador atual
	const { dados: opcoesValidas } = useApi('opcoes-filtros', {
		...filtro,
		jogador: jogadorAtivo || undefined,
	})

	// Filtra a lista de mapas para incluir apenas onde o jogador jogou
	const mapasDisponiveis = opcoesValidas?.mapas
		? mapas.filter(m => opcoesValidas.mapas.includes(m))
		: (jogadores?.find(j => j.puuid === jogadorAtivo)?.mapas
			? mapas.filter(m => jogadores.find(j => j.puuid === jogadorAtivo).mapas.includes(m))
			: mapas)

	// Garante um fallback válido para o mapa e tipo selecionados
	const mapa = mapasDisponiveis.includes(f.mapa) ? f.mapa : (mapasDisponiveis[0] || mapas[0])
	const tipo = tipos.includes(f.tipo) ? f.tipo : tipos[0]

	// Plant é sempre do ataque: o lado não se aplica.
	const semLado = tipo === 'plants'
	const comuns = Object.fromEntries(campos.map(c => [c, filtros[c]]))
	const jogadorParam = jogadores ? f.jogador : undefined
	const resposta = useApi('heatmap', { ...comuns, ...filtro, mapa, tipo, lado: semLado ? '' : f.lado, jogador: jogadorParam })

	return (
		<div className="painel-heatmap">
			<div className="painel-heatmap__controles">
				<BarraFiltros campos={campos} filtro={{ ...filtro, jogador: jogadorAtivo }}>
					{mapasDisponiveis.length > 0 && (
						<label className="barra-filtros__campo">
							<span className="barra-filtros__rotulo">Mapa</span>
							<select
								className="barra-filtros__select"
								value={mapa}
								onChange={e => setF({ mapa: e.target.value })}
							>
								{mapasDisponiveis.map(m => (
									<option key={m} value={m}>{m}</option>
								))}
							</select>
						</label>
					)}
					<label className="barra-filtros__campo">
						<span className="barra-filtros__rotulo">Tipo</span>
						<select
							className="barra-filtros__select"
							value={tipo}
							onChange={e => setF({ tipo: e.target.value })}
						>
							{tipos.map(t => (
								<option key={t} value={t}>{TIPOS[t]}</option>
							))}
						</select>
					</label>
					<label className="barra-filtros__campo" title={semLado ? 'Todo plant é do ataque' : undefined}>
						<span className="barra-filtros__rotulo">Lado</span>
						<select className="barra-filtros__select" value={semLado ? 'Attacker' : f.lado} disabled={semLado} onChange={e => setF({ lado: e.target.value })}>
							<option value="">Ambos</option>
							{Object.entries(LADOS).map(([v, l]) => <option key={v} value={v}>{l.rotulo}</option>)}
						</select>
					</label>
					{jogadores && (
						<label className="barra-filtros__campo">
							<span className="barra-filtros__rotulo">Jogador</span>
							<select className="barra-filtros__select" value={f.jogador} onChange={e => setF({ jogador: e.target.value })}>
								<option value="">Todos</option>
								{jogadores.map(j => <option key={j.puuid} value={j.puuid}>{j.nick}</option>)}
							</select>
						</label>
					)}
				</BarraFiltros>
			</div>
			<Estado resposta={resposta} vazio={() => false} esqueleto="grafico">
				{h => (
					<MapaCalor
						mapa={h.mapa}
						pontos={h.pontos}
						total={h.total}
						partidas={h.partidas}
						descricao={DESCRICOES[tipo]}
					/>
				)}
			</Estado>
		</div>
	)
}

export default PainelHeatmap