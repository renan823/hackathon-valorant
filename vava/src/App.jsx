import { useEffect, useState } from 'react'
import { Outlet } from 'react-router'
import { buscar } from './api'
import Navbar from './components/Navbar'
import './App.css'

const COMANDO_BACKEND = '.venv/bin/uvicorn app.main:app --reload --app-dir backend --port 8000'
const NOVA_TENTATIVA_MS = 5000

// "2026-10-21T16:50:44.51" → "21/10/2026 16:50", sem passar por Date (fuso: plano, seção 2).
function formatarCarga(iso) {
	const [data, hora] = iso.split('T')
	const [a, m, d] = data.split('-')
	return `${d}/${m}/${a} ${hora.slice(0, 5)}`
}

// Layout de todas as páginas (spec 6.1). Só o aviso de backend fora do ar usa o /api/saude (F10):
// enquanto ele falhar, tenta de novo a cada 5 s, e o aviso some sozinho quando o backend sobe.
function App() {
	const [saude, setSaude] = useState(null)
	const [foraDoAr, setForaDoAr] = useState(false)

	useEffect(() => {
		let vivo = true
		let timer
		const verificar = () => buscar('saude').then(
			dados => {
				if (!vivo) return
				setSaude(dados)
				setForaDoAr(false)
			},
			() => {
				if (!vivo) return
				setForaDoAr(true)
				timer = setTimeout(verificar, NOVA_TENTATIVA_MS)
			},
		)
		verificar()
		return () => { vivo = false; clearTimeout(timer) }
	}, [])

	return (
		<div className="layout">
			<Navbar />
			{foraDoAr && (
				<div className="aviso-backend" role="alert">
					<div className="conteudo">
						<strong>Backend fora do ar.</strong> Rode <code>{COMANDO_BACKEND}</code> na raiz do repositório.
						A página volta sozinha quando ele subir.
					</div>
				</div>
			)}
			<main className="layout__principal">
				<Outlet />
			</main>
			<footer className="layout__rodape">
				<div className="conteudo">
					Circuito universitário de Valorant
					{saude && <> · {saude.partidas} partidas · dados carregados em {formatarCarga(saude.carregado_em)}</>}
				</div>
			</footer>
		</div>
	)
}

export default App
