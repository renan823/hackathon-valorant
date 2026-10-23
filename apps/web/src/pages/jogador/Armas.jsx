import { useParams } from 'react-router'
import { useApi } from '../../api'
import { formatar } from '../../formatos'
import Estado from '../../components/Estado'
import IconeArma from '../../components/IconeArma'
import './Armas.css'

const ORDEM_CATEGORIAS = ['Rifle', 'SMG', 'Sniper', 'Heavy', 'Shotgun', 'Sidearm', 'Melee', 'Ability']

function Armas() {
	const { puuid } = useParams()
	const resposta = useApi(`jogadores/${puuid}`)
	return (
		<Estado resposta={resposta} vazio={p => p.armas.length === 0} textoVazio="Nenhum abate registrado.">
			{p => {
				const maxKills = Math.max(...p.armas.map(a => a.kills), 1)
				const grupos = agruparPorCategoria(p.armas)
				return (
					<div className="arsenal">
						{grupos.map(({ cat, armas }) => (
							<section key={cat} className="arsenal__secao">
								<h2 className="arsenal__titulo">{cat}</h2>
								<div className="arsenal__lista card">
									{armas.map(a => (
										<ArmaLinha key={a.meio} arma={a} maxKills={maxKills} />
									))}
								</div>
							</section>
						))}
					</div>
				)
			}}
		</Estado>
	)
}

function ArmaLinha({ arma, maxKills }) {
	const pct = maxKills > 0 ? (100 * arma.kills / maxKills) : 0
	const ehHabilidade = arma.categoria_meio === 'Ability'
	return (
		<div className="arsenal__arma">
			<div className="arsenal__arma-topo">
				<span className="arsenal__arma-nome">
					<IconeArma meio={arma.meio} categoria={arma.categoria_meio} comNome />
				</span>
				<span className="arsenal__kills numero">
					{arma.kills} <span className="muted">kills</span>
					{' '}<span className="muted arsenal__pct">({formatar('pct', arma.pct)})</span>
				</span>
			</div>
			<div className="arsenal__barra-faixa" aria-hidden="true">
				<span className="arsenal__barra-fill" style={{ width: `${pct}%` }} />
			</div>
			<div className="arsenal__stats">
				{ehHabilidade
					? <StatsHabilidade arma={arma} />
					: <StatsArma arma={arma} />}
			</div>
		</div>
	)
}

function StatsArma({ arma }) {
	return (<>
		<Stat rotulo="Rounds" valor={formatar('rounds_utilizados', arma.rounds_utilizados)}
			title="Rounds em que a arma foi carregada ou usada" />
		<Stat rotulo="Partidas" valor={formatar('partidas_com_kill', arma.partidas_com_kill)}
			title="Partidas em que a arma registrou ao menos 1 kill" />
		<Stat rotulo="Conversão" valor={formatar('conversao_pct', arma.conversao_pct)}
			title="% dos rounds com essa arma em que o jogador conseguiu ao menos 1 kill" />
		<Stat rotulo="KAST" valor={formatar('kast_pct', arma.kast_pct)}
			title="% dos rounds com essa arma em que o jogador teve Kill, Assist (>50 de dano), Sobreviveu ou foi Trocado (killer morre em ≤3s)" />
		<Stat rotulo="K/1k cr." valor={formatar('eficiencia_economia', arma.eficiencia_economia)}
			title="Kills por 1.000 créditos de loadout — quanto rendimento a arma gerou em relação ao investimento" />
	</>)
}

function StatsHabilidade({ arma }) {
	return (<>
		<Stat rotulo="Rounds c/ kill" valor={formatar('rounds_com_kill', arma.rounds_com_kill)}
			title="Rounds distintos em que essa habilidade matou alguém" />
		<Stat rotulo="Partidas" valor={formatar('partidas_com_kill', arma.partidas_com_kill)}
			title="Partidas em que essa habilidade registrou ao menos 1 kill" />
		{arma.casts != null && (
			<Stat rotulo="Casts" valor={formatar('casts', arma.casts)}
				title="Total de vezes que a habilidade foi usada nas partidas registradas" />
		)}
		{arma.kills_por_cast != null && (
			<Stat rotulo="K/cast" valor={formatar('kills_por_cast', arma.kills_por_cast)}
				title="Kills por uso da habilidade — calculado sobre o total de casts nas partidas registradas" />
		)}
	</>)
}

function Stat({ rotulo, valor, title }) {
	return (
		<span className="arsenal__stat" title={title}>
			<span className="arsenal__stat-rot">{rotulo}</span>
			<span className="arsenal__stat-val numero">{valor}</span>
		</span>
	)
}

function agruparPorCategoria(armas) {
	const mapa = new Map()
	for (const a of armas) {
		if (!mapa.has(a.categoria_meio)) mapa.set(a.categoria_meio, [])
		mapa.get(a.categoria_meio).push(a)
	}
	const grupos = []
	for (const cat of ORDEM_CATEGORIAS) {
		if (mapa.has(cat)) grupos.push({ cat, armas: mapa.get(cat) })
	}
	for (const [cat, armas] of mapa) {
		if (!ORDEM_CATEGORIAS.includes(cat)) grupos.push({ cat, armas })
	}
	return grupos
}

export default Armas
