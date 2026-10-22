import { useParams } from 'react-router'
import { useApi } from '../../api'
import { linkTime } from '../../formatos'
import Estado from '../../components/Estado'
import Tabela from '../../components/Tabela'
import './Confrontos.css'

// A linha abre a página do adversário.
const COLUNAS = [
	{ chave: 'adversario', link: c => linkTime(c.adversario_id) },
	{ chave: 'partidas' },
	{ chave: 'vitorias' },
	{ chave: 'derrotas' },
]

// Aba Confrontos do time (spec 7.6): adversários por nº de partidas (ordem da API).
function Confrontos() {
	const { id } = useParams()
	const resposta = useApi(`times/${id}`)
	return (
		<Estado resposta={resposta} vazio={p => p.confrontos.length === 0} esqueleto="tabela" textoVazio="Nenhum confronto.">
			{p => (
				<div className="confrontos-time">
					<Tabela
						linhas={p.confrontos.map(c => ({ ...c, derrotas: c.partidas - c.vitorias }))}
						colunas={COLUNAS}
						chave={c => c.adversario_id}
						legenda="Confrontos do time"
					/>
				</div>
			)}
		</Estado>
	)
}

export default Confrontos
