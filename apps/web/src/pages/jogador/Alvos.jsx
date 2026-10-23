import { useState } from 'react'
import { useParams } from 'react-router'
import { useApi } from '../../api'
import Estado from '../../components/Estado'
import Tabela from '../../components/Tabela'
import { formatar } from '../../formatos'
import './Alvos.css'

const COLUNAS = [
	{
		chave: 'alvo',
		rotulo: 'Alvo',
		formato: (alvo, linha) => linha.funcao ? `${alvo} · ${linha.funcao}` : alvo,
	},
	{
		chave: 'comparacao',
		rotulo: 'Participação nos abates',
		ordenavel: false,
		formato: (_, linha) => (
			<div
				className="alvos__barra"
				role="img"
				aria-label={`Armas ${formatar('pct_arma', linha.pct_arma)}, habilidades ${formatar('pct_habilidade', linha.pct_habilidade)}`}
				title={`${linha.kills_arma} abates por arma e ${linha.kills_habilidade} por habilidade (${linha.kills_consideradas} no total)`}
			>
				<span className="alvos__segmento alvos__segmento--arma" style={{ width: `${linha.pct_arma}%` }} />
				<span className="alvos__segmento alvos__segmento--habilidade" style={{ width: `${linha.pct_habilidade}%` }} />
			</div>
		),
	},
	{ chave: 'kills_arma', rotulo: 'Abates por arma' },
	{ chave: 'kills_habilidade', rotulo: 'Abates por habilidade' },
	{ chave: 'kills_consideradas', rotulo: 'Total considerado' },
	{ chave: 'pct_habilidade', rotulo: 'Habilidade / total' },
]

function Alvos() {
	const { puuid } = useParams()
	const [por, setPor] = useState('funcao')
	const resposta = useApi(`jogadores/${puuid}/alvos`, { por })

	return (
		<section className="alvos">
			<header className="card alvos__cabecalho">
				<div>
					<h2>Abates por alvo</h2>
					<p className="muted">
						Compara quantos abates válidos foram finalizados por habilidade ou arma contra cada alvo.
						A participação é calculada somente sobre esses dois tipos de abate.
					</p>
				</div>
				<label className="alvos__seletor">
					<span className="muted">Agrupar alvos por</span>
					<select className="barra-filtros__select" value={por} onChange={e => setPor(e.target.value)}>
						<option value="funcao">Função</option>
						<option value="agente">Agente</option>
					</select>
				</label>
			</header>

			<Estado
				resposta={resposta}
				vazio={linhas => linhas.length === 0}
				textoVazio="Nenhum abate por arma ou habilidade encontrado contra estes alvos."
				esqueleto="tabela"
			>
				{linhas => (
					<>
						<div className="alvos__legenda muted" aria-label="Legenda do gráfico">
							<span><i className="alvos__amostra alvos__amostra--arma" />Armas</span>
							<span><i className="alvos__amostra alvos__amostra--habilidade" />Habilidades</span>
						</div>
						<Tabela linhas={linhas} colunas={COLUNAS} chave={linha => linha.alvo} legenda="Abates por arma e habilidade por alvo" />
						<p className="alvos__nota muted">
							Abates por queda e esmagamento não entram no total. “Habilidade” representa a categoria
							registrada pela fonte; em alguns casos, ela não identifica a habilidade específica.
							A participação não mede eficácia por cast nem causalidade.
						</p>
					</>
				)}
			</Estado>
		</section>
	)
}

export default Alvos
