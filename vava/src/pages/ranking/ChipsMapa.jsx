import { useApi } from '../../api'
import { useFiltros } from '../../filtros'

// Chips de mapa, como as abas de mapa do Leaderboards (spec 7.2). Gravam o filtro `mapa` da URL.
function ChipsMapa() {
	const { filtros, setFiltro } = useFiltros()
	const { dados: opcoes } = useApi('filtros')
	const mapa = filtros.mapa[0] ?? null

	return (
		<div className="ranking__mapas rolagem-x" role="group" aria-label="Mapa">
			<button className={`chip ${!mapa ? 'chip--ativo' : ''}`} aria-pressed={!mapa} onClick={() => setFiltro('mapa', null)}>Todos</button>
			{opcoes?.mapas.map(m => (
				<button key={m} className={`chip ${mapa === m ? 'chip--ativo' : ''}`} aria-pressed={mapa === m} onClick={() => setFiltro('mapa', m)}>{m}</button>
			))}
		</div>
	)
}

export default ChipsMapa
