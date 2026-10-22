import { useParams } from 'react-router'
import { useApi } from '../../api'
import { formatar, linkPartida } from '../../formatos'
import Estado from '../../components/Estado'
import SeloAgente from '../../components/SeloAgente'
import Tabela from '../../components/Tabela'

// Aba Partidas do jogador (spec 7.5): uma linha por partida, mais recente primeiro (ordem da API).
// A linha abre a partida; por isso time e adversário vão como texto, sem link próprio.
const COLUNAS = [
	{ chave: 'data', link: p => linkPartida(p.match_id) },
	{ chave: 'mapa' },
	{ chave: 'time' },
	{ chave: 'adversario' },
	{ chave: 'placar_time', rotulo: 'Placar', alinhar: 'centro', formato: (_, p) => `${p.placar_time}–${p.placar_adversario}` },
	{ chave: 'venceu', alinhar: 'centro', formato: v => <span className={v ? 'bom' : 'ruim'}>{formatar('venceu', v)}</span> },
	{ chave: 'agente', formato: a => <span className="selo-e-nome"><SeloAgente agente={a} /> {a}</span> },
	{ chave: 'kills' }, { chave: 'deaths' }, { chave: 'assists' },
	{ chave: 'mais_menos', cor: true },
	{ chave: 'acs', cor: true }, { chave: 'adr', cor: true },
	{ chave: 'kast_pct', cor: true }, { chave: 'hs_pct', cor: true },
	{ chave: 'first_kills' }, { chave: 'multikills' },
]

function Partidas() {
	const { puuid } = useParams()
	const resposta = useApi(`jogadores/${puuid}/partidas`)

	return (
		<Estado resposta={resposta} esqueleto="tabela" textoVazio="Nenhuma partida.">
			{partidas => <Tabela linhas={partidas} colunas={COLUNAS} chave={p => p.match_id} legenda="Partidas do jogador" />}
		</Estado>
	)
}

export default Partidas
