import { corQualidade, formatar, rotulo as rotuloDe } from '../formatos'
import './StatTile.css'

// Número grande de cabeçalho (Jogador, Time, Partida): formatado e colorido pela coluna (spec 6.4).
function StatTile({ coluna, valor, rotulo, legenda }) {
	const qualidade = corQualidade(coluna, valor)
	return (
		<div className="stat-tile">
			<span className="stat-tile__rotulo">{rotulo ?? rotuloDe(coluna)}</span>
			<span className={`stat-tile__valor ${qualidade ?? ''}`}>{formatar(coluna, valor)}</span>
			{legenda && <span className="stat-tile__legenda">{legenda}</span>}
		</div>
	)
}

export default StatTile
