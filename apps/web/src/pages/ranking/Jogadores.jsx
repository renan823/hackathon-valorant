import { useApi } from '../../api'
import { MIN_ROUNDS_PADRAO } from '../../constants'
import { useFiltros, useParametros } from '../../filtros'
import { contagem, formatar, linkJogador, rotulo } from '../../formatos'
import BarraFiltros from '../../components/BarraFiltros'
import Estado from '../../components/Estado'
import Histograma from '../../components/Histograma'
import Nick from '../../components/Nick'
import SeloAgente from '../../components/SeloAgente'
import Tabela from '../../components/Tabela'
import ChipsMapa from './ChipsMapa'

const OPCOES_MIN_ROUNDS = [50, 100, 150, 200]
const LIMITE_PADRAO = 100
const TODOS = 1000

// Só métricas aceitas pelo `ordenar` da API são ordenáveis; a ordenação é no servidor (spec 7.2),
// para a posição (#) continuar coerente.
const COLUNAS = [
	{
		chave: 'nick',
		ordenavel: false,
		link: j => linkJogador(j.puuid),
		formato: (_, j) => <span className="ranking__jogador"><span className="ranking__posicao numero">{j.posicao}</span><Nick nick={j.nick} /></span>,
	},
	{ chave: 'time', ordenavel: false },
	{ chave: 'agente_principal', ordenavel: false, formato: a => <span className="selo-e-nome"><SeloAgente agente={a} /> {a}</span> },
	{ chave: 'partidas' },
	{ chave: 'win_pct', cor: true },
	{ chave: 'acs', cor: true },
	{ chave: 'kd', cor: true },
	{ chave: 'adr', cor: true },
	{ chave: 'kast_pct', cor: true },
	{ chave: 'hs_pct', cor: true },
	{ chave: 'fk_round', cor: true },
	{ chave: 'mais_menos', cor: true },
]

// Aba Jogadores do Ranking, o Leaderboards do csstats (spec 7.2): chips de mapa, filtros, corte de rounds e
// ordenação no servidor. O histograma mostra a métrica da ordenação, com os mesmos filtros e o mesmo corte.
function Jogadores() {
	const { filtros } = useFiltros()
	const [p, setP] = useParametros({ ordenar: 'acs', ordem: 'desc', min_rounds: String(MIN_ROUNDS_PADRAO), limite: String(LIMITE_PADRAO) })
	const resposta = useApi('jogadores', { ...filtros, ...p })
	const distribuicao = useApi('jogadores/distribuicao', { ...filtros, metrica: p.ordenar, min_rounds: p.min_rounds })

	return (
		<div className="ranking__aba">
			<ChipsMapa />

			<div className="ranking__controles">
				<BarraFiltros campos={['torneio', 'fase', 'time', 'agente', 'funcao']} />
				<label className="barra-filtros__campo ranking__corte">
					<span className="barra-filtros__rotulo">Mín. rounds</span>
					<select className="barra-filtros__select" value={p.min_rounds} onChange={e => setP({ min_rounds: e.target.value })}>
						{OPCOES_MIN_ROUNDS.map(n => <option key={n} value={n}>{n}{n === MIN_ROUNDS_PADRAO ? ' (padrão)' : ''}</option>)}
					</select>
				</label>
			</div>

			<section className="card ranking__distribuicao">
				<header className="ranking__distribuicao-cabecalho">
					<h2>Distribuição de {rotulo(p.ordenar)}</h2>
					{distribuicao.dados?.length > 0 && (
						<span className="muted numero">
							{contagem(distribuicao.dados.reduce((n, f) => n + f.jogadores, 0), 'jogador', 'jogadores')} com {p.min_rounds}+ rounds
						</span>
					)}
				</header>
				<Estado resposta={distribuicao} esqueleto="grafico" textoVazio="Nenhum jogador com estes filtros.">
					{faixas => <Histograma faixas={faixas} metrica={p.ordenar} />}
				</Estado>
			</section>

			<Estado resposta={resposta} esqueleto="tabela">
				{jogadores => (
					<>
						<Tabela
							linhas={jogadores}
							colunas={COLUNAS}
							chave={j => j.puuid}
							ordenacao={{ coluna: p.ordenar, ordem: p.ordem }}
							onOrdenar={o => setP({ ordenar: o.coluna, ordem: o.ordem })}
							alturaMax="70vh"
							legenda="Ranking de jogadores"
						/>
						<p className="ranking__rodape muted">
							{Number(p.limite) < TODOS && jogadores.length >= Number(p.limite) ? (
								<>
									Mostrando os {formatar('partidas', jogadores.length)} primeiros, com {p.min_rounds}+ rounds
									<button className="botao" onClick={() => setP({ limite: TODOS })}>Mostrar todos</button>
								</>
							) : (
								<>{contagem(jogadores.length, 'jogador', 'jogadores')} com {p.min_rounds}+ rounds</>
							)}
						</p>
					</>
				)}
			</Estado>
		</div>
	)
}

export default Jogadores
