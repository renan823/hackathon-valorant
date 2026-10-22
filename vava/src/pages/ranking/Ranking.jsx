import { Outlet } from 'react-router'
import Abas from '../../components/Abas'
import './Ranking.css'

// Layout do Ranking (spec 7.2): título e as abas Jogadores e Times. Cada aba tem os próprios filtros.
function Ranking() {
	return (
		<section className="conteudo ranking">
			<h1>Ranking</h1>
			<Abas itens={[
				{ rotulo: 'Jogadores', para: '/ranking' },
				{ rotulo: 'Times', para: '/ranking/times' },
			]} />
			<Outlet />
		</section>
	)
}

export default Ranking
