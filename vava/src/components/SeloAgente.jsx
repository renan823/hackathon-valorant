import { useState } from 'react'
import { iconeAgente } from '../formatos'
import './SeloAgente.css'

// Ícone do agente (vava/public/agentes, F4), com o nome no title. Se a imagem falhar, volta às iniciais num
// selo neutro. Sem cor por função: 4 cores lado a lado não passam no validador de paleta.
function SeloAgente({ agente }) {
	const src = iconeAgente(agente)
	const [falhou, setFalhou] = useState(null)

	if (agente && falhou !== src) {
		return <img className="selo-agente selo-agente--icone" src={src} alt={agente} title={agente} loading="lazy" onError={() => setFalhou(src)} />
	}
	const iniciais = String(agente ?? '').replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2).toUpperCase()
	return (
		<span className="selo-agente" title={agente} aria-label={agente} role="img">
			{iniciais}
		</span>
	)
}

export default SeloAgente
