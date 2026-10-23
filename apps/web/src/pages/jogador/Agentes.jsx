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

const COLUNAS_HABILIDADES = [
	{ chave: 'agente' },
	{ chave: 'casts_por_round' },
	{ chave: 'media_funcao' },
	{ chave: 'diferenca_funcao' },
	{ chave: 'media_agente' },
	{ chave: 'diferenca_agente' },
	{ chave: 'jogadores_funcao' },
	{ chave: 'jogadores_agente' },
	{ chave: 'abaixo_funcao' },
	{ chave: 'abaixo_agente' },
]

// Aba Agentes do jogador (spec 7.5): `por_agente` do perfil (mesma resposta do layout, do cache).
function Agentes() {
	const { puuid } = useParams()
	const resposta = useApi(`jogadores/${puuid}`)
	return (
		<Estado resposta={resposta} vazio={() => false} esqueleto="tabela">
			{p => (
				<>
					<Tabela linhas={p.por_agente} colunas={COLUNAS} chave={a => a.agente} legenda="Desempenho por agente" />
					<section className="card">
						<h2>Uso de habilidades</h2>
						<p className="muted">
							Casts por round comparados com a média de jogadores da função e de quem jogou com o mesmo agente.
							Cada jogador tem o mesmo peso; as amostras aparecem na tabela.
						</p>
						<Tabela
							linhas={p.por_agente}
							colunas={COLUNAS_HABILIDADES}
							chave={a => a.agente}
							legenda="Uso de habilidades comparado com as médias por função e agente"
						/>
					</section>
				</>
			)}
		</Estado>
	)
}

export default Agentes
