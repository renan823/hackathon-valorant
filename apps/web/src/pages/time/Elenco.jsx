import { useParams } from 'react-router'
import { useApi } from '../../api'
import { linkJogador } from '../../formatos'
import Estado from '../../components/Estado'
import Nick from '../../components/Nick'
import SeloAgente from '../../components/SeloAgente'
import Tabela from '../../components/Tabela'

// As colunas do ranking (spec 7.6), sem a de time; os números são só das partidas por este time.
const COLUNAS = [
	{ chave: 'nick', link: j => linkJogador(j.puuid), formato: n => <Nick nick={n} /> },
	{ chave: 'agente_principal', formato: a => <span className="selo-e-nome"><SeloAgente agente={a} /> {a}</span> },
	{ chave: 'partidas' }, { chave: 'rounds' },
	{ chave: 'win_pct', cor: true },
	{ chave: 'acs', cor: true }, { chave: 'kd', cor: true },
	{ chave: 'adr', cor: true }, { chave: 'kast_pct', cor: true },
	{ chave: 'hs_pct', cor: true }, { chave: 'fk_round', cor: true },
	{ chave: 'mais_menos', cor: true },
]

// Aba Elenco do time: `elenco` do perfil (mesma resposta do layout, do cache), por ACS.
function Elenco() {
	const { id } = useParams()
	const resposta = useApi(`times/${id}`)
	return (
		<Estado resposta={resposta} vazio={p => p.elenco.length === 0} esqueleto="tabela" textoVazio="Nenhum jogador.">
			{p => <Tabela linhas={p.elenco} colunas={COLUNAS} chave={j => j.puuid} legenda="Elenco do time" />}
		</Estado>
	)
}

export default Elenco
