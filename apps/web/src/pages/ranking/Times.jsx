import { useApi } from '../../api'
import { MIN_PARTIDAS_PADRAO } from '../../constants'
import { useFiltros, useParametros } from '../../filtros'
import { contagem, linkTime } from '../../formatos'
import BarraFiltros from '../../components/BarraFiltros'
import Estado from '../../components/Estado'
import Tabela from '../../components/Tabela'
import ChipsMapa from './ChipsMapa'

const OPCOES_MIN_PARTIDAS = [0, 5, 8, 10]

// A API não aceita `ordenar` em /times: a ordem padrão (win% e depois saldo) vem dela, e as colunas ordenam
// no cliente. A posição (#) é a da API e não muda quando outra coluna ordena.
const COLUNAS = [
	{
		chave: 'nome',
		ordenavel: false,
		link: t => linkTime(t.time_id),
		formato: (nome, t) => <span className="ranking__jogador"><span className="ranking__posicao numero">{t.posicao}</span>{nome}</span>,
	},
	{ chave: 'partidas' },
	{ chave: 'vitorias', rotulo: 'V-D', alinhar: 'centro', formato: (v, t) => `${v}-${t.derrotas}` },
	{ chave: 'win_pct', cor: true },
	{ chave: 'saldo_rounds', cor: true },
	{ chave: 'atk_win_pct', cor: true },
	{ chave: 'def_win_pct', cor: true },
	{ chave: 'pistol_win_pct', cor: true },
]

// Aba Times do Ranking (spec 7.2, F1): o corte de partidas é sempre enviado, porque o padrão da API é 0.
// Só os filtros que valem para times: mapa, torneio e fase.
function Times() {
	const { filtros } = useFiltros()
	const [p, setP] = useParametros({ min_partidas: String(MIN_PARTIDAS_PADRAO) })
	const resposta = useApi('times', { mapa: filtros.mapa, torneio: filtros.torneio, fase: filtros.fase, min_partidas: p.min_partidas })

	return (
		<div className="ranking__aba">
			<ChipsMapa />

			<div className="ranking__controles ranking__controles--curtos">
				<BarraFiltros campos={['torneio', 'fase']} />
				<label className="barra-filtros__campo ranking__corte">
					<span className="barra-filtros__rotulo">Mín. partidas</span>
					<select className="barra-filtros__select" value={p.min_partidas} onChange={e => setP({ min_partidas: e.target.value })}>
						{OPCOES_MIN_PARTIDAS.map(n => <option key={n} value={n}>{n}{n === MIN_PARTIDAS_PADRAO ? ' (padrão)' : ''}</option>)}
					</select>
				</label>
			</div>

			<Estado resposta={resposta} esqueleto="tabela">
				{times => (
					<>
						<Tabela linhas={times} colunas={COLUNAS} chave={t => t.time_id} alturaMax="70vh" legenda="Ranking de times" />
						<p className="ranking__rodape muted">
							{contagem(times.length, 'time')}{Number(p.min_partidas) > 0 && ` com ${p.min_partidas}+ partidas`}
						</p>
					</>
				)}
			</Estado>
		</div>
	)
}

export default Times
