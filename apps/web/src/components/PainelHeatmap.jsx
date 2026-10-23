import { useApi } from '../api'
import { LADOS } from '../constants'
import { useFiltros, useParametros } from '../filtros'
import BarraFiltros from './BarraFiltros'
import Estado from './Estado'
import MapaCalor from './MapaCalor'
import './PainelHeatmap.css'

const TIPOS = { kills: 'Kills', mortes: 'Mortes', plants: 'Plants' }

// Explorador de heatmap (spec 7.5, 7.6 e 7.8) em volta do /api/heatmap:
// - `mapas`: os mapas que dá para escolher (padrão: o primeiro). Com um só, os chips somem;
// - `filtro`: parâmetros fixos, de quem são as ações ({ jogador: puuid }, { time: id } ou nada);
// - `jogadores`: lista opcional de { puuid, nick } para habilitar filtro por jogador;
// - `tipos`: subconjunto de kills, mortes e plants; `campos`: os filtros comuns da BarraFiltros.
// Tudo fica na URL. Os filtros valem para quem age: onde matou (Kills), onde morreu (Mortes) ou onde plantou.
function PainelHeatmap({ mapas, filtro = {}, jogadores, tipos = ['kills', 'mortes'], campos = ['torneio', 'fase'] }) {
	const { filtros } = useFiltros()
	const [f, setF] = useParametros({ mapa: mapas[0], tipo: tipos[0], lado: '', jogador: '' })
	const mapa = mapas.includes(f.mapa) ? f.mapa : mapas[0]
	const tipo = tipos.includes(f.tipo) ? f.tipo : tipos[0]
	// Plant é sempre do ataque: o lado não se aplica.
	const semLado = tipo === 'plants'
	const comuns = Object.fromEntries(campos.map(c => [c, filtros[c]]))
	const jogadorParam = jogadores ? f.jogador : undefined
	const resposta = useApi('heatmap', { ...comuns, ...filtro, mapa, tipo, lado: semLado ? '' : f.lado, jogador: jogadorParam })

	return (
		<div className="painel-heatmap">
			<div className="painel-heatmap__controles">
				{mapas.length > 1 && (
					<div className="painel-heatmap__chips rolagem-x" role="group" aria-label="Mapa">
						{mapas.map(m => (
							<button key={m} className={`chip ${m === mapa ? 'chip--ativo' : ''}`} aria-pressed={m === mapa} onClick={() => setF({ mapa: m })}>{m}</button>
						))}
					</div>
				)}
				<div className="painel-heatmap__chips" role="group" aria-label="Tipo">
					{tipos.map(t => (
						<button key={t} className={`chip ${tipo === t ? 'chip--ativo' : ''}`} aria-pressed={tipo === t} onClick={() => setF({ tipo: t })}>{TIPOS[t]}</button>
					))}
				</div>
				<BarraFiltros campos={campos}>
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
				{h => <MapaCalor mapa={h.mapa} pontos={h.pontos} total={h.total} />}
			</Estado>
		</div>
	)
}

export default PainelHeatmap
