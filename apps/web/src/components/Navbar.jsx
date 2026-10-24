import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router'
import { Menu, X } from 'lucide-react'
import Busca from './Busca'
import './Navbar.css'

const LINKS = [
	{ para: '/ranking', rotulo: 'Ranking' },
	{ para: '/partidas', rotulo: 'Partidas' },
	{ para: '/mapas', rotulo: 'Mapas' },
	{ para: '/analises', rotulo: 'Análises' },
]

function Navbar() {
	const [aberto, setAberto] = useState(false)
	const fechar = () => setAberto(false)

	// Esc fecha o menu.
	useEffect(() => {
		if (!aberto) return
		const aoTeclar = e => e.key === 'Escape' && setAberto(false)
		window.addEventListener('keydown', aoTeclar)
		return () => window.removeEventListener('keydown', aoTeclar)
	}, [aberto])

	return (
		<header className="navbar">
			<div className="navbar__barra">
				<Link to="/" className="navbar__logo" onClick={fechar}>VAVÁ<span>lise</span></Link>

				<button
					className="navbar__menu-botao"
					aria-expanded={aberto}
					aria-controls="navbar-links"
					onClick={() => setAberto(a => !a)}
				>
					{aberto ? <X size={20} /> : <Menu size={20} />}
					<span className="sr-only">{aberto ? 'Fechar menu' : 'Abrir menu'}</span>
				</button>

				<nav id="navbar-links" className={`navbar__links ${aberto ? 'navbar__links--aberto' : ''}`}>
					{LINKS.map(l => (
						<NavLink key={l.para} to={l.para} className="navbar__link" onClick={fechar}>{l.rotulo}</NavLink>
					))}
				</nav>

				<div className="navbar__busca"><Busca /></div>
			</div>
		</header>
	)
}

export default Navbar
