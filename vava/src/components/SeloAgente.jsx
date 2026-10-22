import './SeloAgente.css'

// Iniciais do agente num selo neutro, com o nome no title (F4). Os ícones entram na T3.8b.
// Sem cor por função: 4 cores lado a lado não passam no validador de paleta.
function SeloAgente({ agente }) {
	const iniciais = String(agente ?? '').replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2).toUpperCase()
	return (
		<span className="selo-agente" title={agente} aria-label={agente} role="img">
			{iniciais}
		</span>
	)
}

export default SeloAgente
