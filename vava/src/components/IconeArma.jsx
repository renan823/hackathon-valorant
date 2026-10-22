import { useState } from 'react'
import { iconeArma } from '../formatos'
import './IconeArma.css'

// Silhueta da arma (vava/public/armas, F4), com o nome no alt e no title. Habilidade (categoria Ability, ex.:
// Headhunter) não tem ícone e sai como texto; arquivo que falhar também. `comNome` escreve o nome ao lado.
function IconeArma({ meio, categoria, comNome = false }) {
	const src = iconeArma(meio)
	const [falhou, setFalhou] = useState(null)

	if (categoria === 'Ability' || falhou === src) return <span className="icone-arma icone-arma--texto">{meio}</span>
	const imagem = <img className="icone-arma" src={src} alt={comNome ? '' : meio} title={meio} loading="lazy" onError={() => setFalhou(src)} />
	return comNome ? <span className="icone-arma__com-nome">{imagem}<span>{meio}</span></span> : imagem
}

export default IconeArma
