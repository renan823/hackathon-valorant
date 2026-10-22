import { useEffect, useId, useState } from 'react'
import { useNavigate } from 'react-router'
import { Search, User, Users } from 'lucide-react'
import { useApi } from '../api'
import { linkJogador, linkTime } from '../formatos'
import './Busca.css'

const ESPERA_MS = 250
const MINIMO = 2

// Busca de jogador ou time (spec 7.9): debounce de 250 ms, mínimo de 2 caracteres, até 10 resultados.
// ↑/↓ navegam, Enter abre o selecionado (ou o primeiro), Esc fecha. `grande` é a versão da Home.
function Busca({ grande = false }) {
	const navegar = useNavigate()
	const id = useId()
	const [texto, setTexto] = useState('')
	const [termo, setTermo] = useState('')
	const [aberto, setAberto] = useState(false)
	const [ativo, setAtivo] = useState(-1)

	// Debounce: o termo buscado só muda 250 ms depois da última tecla.
	useEffect(() => {
		const timer = setTimeout(() => setTermo(texto.trim()), ESPERA_MS)
		return () => clearTimeout(timer)
	}, [texto])

	const buscando = termo.length >= MINIMO
	const { dados, carregando } = useApi(buscando ? 'busca' : null, { q: termo })
	const resultados = buscando ? (dados ?? []) : []
	const mostrar = aberto && texto.trim().length >= MINIMO

	function abrir(r) {
		setTexto('')
		setTermo('')
		setAberto(false)
		setAtivo(-1)
		navegar(r.tipo === 'jogador' ? linkJogador(r.id) : linkTime(r.id))
	}

	function aoTeclar(e) {
		if (e.key === 'ArrowDown' && resultados.length) {
			e.preventDefault()
			setAberto(true)
			setAtivo(i => (i + 1) % resultados.length)
		} else if (e.key === 'ArrowUp' && resultados.length) {
			e.preventDefault()
			setAtivo(i => (i <= 0 ? resultados.length - 1 : i - 1))
		} else if (e.key === 'Enter' && resultados.length) {
			e.preventDefault()
			abrir(resultados[ativo >= 0 ? ativo : 0])
		} else if (e.key === 'Escape') {
			setAberto(false)
			setAtivo(-1)
		}
	}

	return (
		<div className={`busca ${grande ? 'busca--grande' : ''}`}>
			<Search className="busca__icone" size={grande ? 20 : 16} aria-hidden="true" />
			<input
				type="search"
				className="busca__campo"
				placeholder="Buscar jogador ou time"
				value={texto}
				role="combobox"
				aria-label="Buscar jogador ou time"
				aria-expanded={mostrar}
				aria-controls={`${id}-lista`}
				aria-autocomplete="list"
				aria-activedescendant={mostrar && ativo >= 0 ? `${id}-${ativo}` : undefined}
				onChange={e => { setTexto(e.target.value); setAberto(true); setAtivo(-1) }}
				onFocus={() => setAberto(true)}
				onBlur={() => setAberto(false)}
				onKeyDown={aoTeclar}
			/>
			{mostrar && (
				<ul className="busca__lista" id={`${id}-lista`} role="listbox">
					{carregando && <li className="busca__aviso muted">Buscando…</li>}
					{!carregando && resultados.length === 0 && <li className="busca__aviso muted">Nada encontrado.</li>}
					{resultados.map((r, i) => (
						<li
							key={`${r.tipo}-${r.id}`}
							id={`${id}-${i}`}
							role="option"
							aria-selected={i === ativo}
							className={`busca__item ${i === ativo ? 'busca__item--ativo' : ''}`}
							// mousedown em vez de click: o blur do campo fecharia a lista antes do clique.
							onMouseDown={e => { e.preventDefault(); abrir(r) }}
							onMouseEnter={() => setAtivo(i)}
						>
							{r.tipo === 'jogador' ? <User size={16} aria-hidden="true" /> : <Users size={16} aria-hidden="true" />}
							<span className="busca__nome">{r.nome}</span>
							<span className="busca__detalhe muted">{r.detalhe}</span>
						</li>
					))}
				</ul>
			)}
		</div>
	)
}

export default Busca
