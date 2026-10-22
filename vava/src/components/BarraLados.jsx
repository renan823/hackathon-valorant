import { formatar } from '../formatos'
import './BarraLados.css'

// % de rounds vencidos por lado, numa barra dividida ataque | defesa nas cores de lado, com a marca dos 50%.
// Os dois números ficam escritos embaixo, então o lado não depende só da cor. Defesa = 100 − ataque: todo
// round é vencido por um dos lados. Não usar numa tela que colore times (F12).
function BarraLados({ atk }) {
	return (
		<span className="barra-lados">
			<span className="barra-lados__barra" aria-hidden="true">
				<span className="barra-lados__atk" style={{ flexGrow: atk }} />
				<span className="barra-lados__def" style={{ flexGrow: 100 - atk }} />
			</span>
			<span className="barra-lados__rotulos numero">
				<span>Ataque <strong>{formatar('atk_win_pct', atk)}</strong></span>
				<span><strong>{formatar('def_win_pct', 100 - atk)}</strong> Defesa</span>
			</span>
		</span>
	)
}

export default BarraLados
