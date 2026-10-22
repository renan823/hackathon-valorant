import { formatar } from '../formatos'

// Um card por linha (spec 8): `x` é o rótulo e `y` o valor. Ex.: pistol (1º, 2º e total).
function Kpis({ dados, grafico }) {
	const { x, y } = grafico
	return (
		<div className="grade grafico-kpis" style={{ '--grade-min': '160px' }}>
			{dados.map(d => (
				<div key={d[x]} className="grafico-kpis__card">
					<span className="grafico-kpis__valor">{formatar(y, d[y])}</span>
					<span className="muted">{formatar(x, d[x])}</span>
				</div>
			))}
		</div>
	)
}

export default Kpis
