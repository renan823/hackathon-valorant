import './App.css'

// Provisório (T0.1/T0.3): vitrine dos estilos base. O layout com navbar e rotas entra na T0.4.
function App() {
	return (
		<main className="conteudo">
			<h1>VAVA Stats</h1>
			<div className="card">
				<p className="muted">Estilos base</p>
				<p>
					<button className="chip chip--ativo">Todos</button>{' '}
					<button className="chip">Ascent</button>{' '}
					<button className="chip">Haven</button>{' '}
					<a href="#">link</a>{' '}
					<button className="botao">Botão</button>
				</p>
				<p className="numero">
					ACS <span className="bom">287</span> · K/D <span className="bom">1,68</span> · HS% 30,7% · +/− <span className="ruim">−3</span>
				</p>
			</div>
			<div className="grade" style={{ marginTop: 12 }}>
				{['--time-a', '--time-b', '--atk', '--def', '--serie-2', '--serie-5'].map(t => (
					<div key={t} className="card"><span style={{ color: `var(${t})` }}>■</span> {t}</div>
				))}
			</div>
		</main>
	)
}

export default App
