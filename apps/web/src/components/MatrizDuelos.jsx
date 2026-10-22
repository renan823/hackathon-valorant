import Nick from './Nick'
import SeloAgente from './SeloAgente'
import './MatrizDuelos.css'

// Matriz 5 × 5 dos duelos (spec 7.4): linhas = jogadores do time A, colunas = do time B, ordenados por kills.
// Cada célula é "abates do jogador da linha – abates do jogador da coluna", com o fundo na cor da equipe que
// venceu o duelo (neutro no empate). Só abates válidos (a API já filtra).
function MatrizDuelos({ duelos, partida }) {
	const { time_a: a, time_b: b } = partida
	const porKills = (x, y) => y.kills - x.kills
	const linhas = duelos.nos.filter(n => n.time_id === a.id).sort(porKills)
	const colunas = duelos.nos.filter(n => n.time_id === b.id).sort(porKills)

	// Placar do duelo visto pelo jogador da linha: [abates dele, abates do outro].
	const placar = new Map()
	for (const e of duelos.arestas) {
		placar.set(`${e.a}|${e.b}`, [e.kills_a, e.kills_b])
		placar.set(`${e.b}|${e.a}`, [e.kills_b, e.kills_a])
	}
	const duelo = (l, c) => placar.get(`${l.id}|${c.id}`) ?? [0, 0]
	const soma = pares => pares.reduce((t, [x, y]) => [t[0] + x, t[1] + y], [0, 0])

	return (
		<div className="matriz-duelos">
			<p className="muted matriz-duelos__eixos">
				Linhas: {a.nome} · Colunas: {b.nome} · cada célula: abates da linha – abates da coluna
			</p>
			<div className="rolagem-x">
				<table className="matriz-duelos__tabela">
					<thead>
						<tr>
							<td className="matriz-duelos__canto" />
							{colunas.map(c => (
								<th key={c.id} scope="col">
									<span className="matriz-duelos__jogador matriz-duelos__jogador--b"><SeloAgente agente={c.agente} /><Nick puuid={c.id} nick={c.nick} /></span>
								</th>
							))}
							<th scope="col" className="matriz-duelos__total">Total</th>
						</tr>
					</thead>
					<tbody>
						{linhas.map(l => {
							const total = soma(colunas.map(c => duelo(l, c)))
							return (
								<tr key={l.id}>
									<th scope="row">
										<span className="matriz-duelos__jogador matriz-duelos__jogador--a"><SeloAgente agente={l.agente} /><Nick puuid={l.id} nick={l.nick} /></span>
									</th>
									{colunas.map(c => {
										const [x, y] = duelo(l, c)
										const vencedor = x > y ? 'a' : y > x ? 'b' : null
										return (
											<td
												key={c.id}
												className={`numero ${vencedor ? `matriz-duelos__celula--${vencedor}` : ''}`}
												title={`${l.nick} ${x} × ${y} ${c.nick}`}
											>
												{x + y === 0 ? <span className="muted">—</span> : `${x}–${y}`}
											</td>
										)
									})}
									<td className="numero matriz-duelos__total">{total[0]}–{total[1]}</td>
								</tr>
							)
						})}
						<tr className="matriz-duelos__linha-total">
							<th scope="row">Total</th>
							{colunas.map(c => {
								const [x, y] = soma(linhas.map(l => duelo(l, c)))
								return <td key={c.id} className="numero matriz-duelos__total">{x}–{y}</td>
							})}
							<td className="numero matriz-duelos__total" />
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	)
}

export default MatrizDuelos
