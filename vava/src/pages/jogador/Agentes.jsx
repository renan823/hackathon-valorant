import { useParams } from 'react-router'
import { useApi } from '../../api'
import Estado from '../../components/Estado'
import SeloAgente from '../../components/SeloAgente'
import Tabela from '../../components/Tabela'

const COLUNAS = [
	{ chave: 'agente', formato: a => <span className="selo-e-nome"><SeloAgente agente={a} /> {a}</span> },
	{ chave: 'funcao' },
	{ chave: 'partidas' }, { chave: 'vitorias' },
	{ chave: 'win_pct', cor: true }, { chave: 'rounds' },
	{ chave: 'acs', cor: true }, { chave: 'kd', cor: true },
	{ chave: 'adr', cor: true }, { chave: 'kast_pct', cor: true },
]

// Aba Agentes do jogador (spec 7.5): `por_agente` do perfil (mesma resposta do layout, do cache).
function Agentes() {
	const { puuid } = useParams()
	const resposta = useApi(`jogadores/${puuid}`)
	return (
		<Estado resposta={resposta} vazio={() => false} esqueleto="tabela">
			{p => <Tabela linhas={p.por_agente} colunas={COLUNAS} chave={a => a.agente} legenda="Desempenho por agente" />}
		</Estado>
	)
}

export default Agentes
