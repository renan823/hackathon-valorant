import { useApi } from '../api'
import { useFiltros } from '../filtros'
import { rotulo } from '../formatos'
import './BarraFiltros.css'

// Opções de cada filtro a partir de /api/filtros: [{ valor, texto }].
function opcoesDe(campo, opcoes, filtros) {
	switch (campo) {
		case 'torneio': return opcoes.torneios.map(t => ({ valor: t.nome, texto: t.nome }))
		case 'fase': {
			// Com um torneio escolhido, só as fases dele (spec 5.2).
			const torneios = filtros.torneio.length ? opcoes.torneios.filter(t => filtros.torneio.includes(t.nome)) : opcoes.torneios
			return [...new Set(torneios.flatMap(t => t.fases))].map(f => ({ valor: f, texto: f }))
		}
		case 'mapa': return opcoes.mapas.map(m => ({ valor: m, texto: m }))
		case 'time': return opcoes.times.map(t => ({ valor: t.id, texto: t.nome }))
		case 'agente': return opcoes.agentes.map(a => ({ valor: a.nome, texto: a.nome }))
		case 'funcao': return opcoes.funcoes.map(f => ({ valor: f, texto: f }))
		default: return []
	}
}

// Selects dos filtros comuns ligados à URL. `campos` diz quais mostrar (spec 5.2, tabela por página).
// Um valor por filtro na v1 (F5). `children` entra antes dos campos, na mesma linha (ex.: o Lado do heatmap).
function BarraFiltros({ campos, children }) {
	const { filtros, setFiltro, limpar } = useFiltros()
	const { dados: opcoes } = useApi('filtros')
	const algumAtivo = campos.some(c => filtros[c].length)

	return (
		<div className="barra-filtros" role="group" aria-label="Filtros">
			{children}
			{campos.map(campo => (
				<label key={campo} className="barra-filtros__campo">
					<span className="barra-filtros__rotulo">{rotulo(campo)}</span>
					<select
						className="barra-filtros__select"
						value={filtros[campo][0] ?? ''}
						disabled={!opcoes}
						onChange={e => setFiltro(campo, e.target.value || null)}
					>
						<option value="">Todos</option>
						{opcoes && opcoesDe(campo, opcoes, filtros).map(o => (
							<option key={o.valor} value={o.valor}>{o.texto}</option>
						))}
					</select>
				</label>
			))}
			{algumAtivo && (
				<button className="botao botao--fantasma barra-filtros__limpar" onClick={() => limpar(campos)}>Limpar filtros</button>
			)}
		</div>
	)
}

export default BarraFiltros
