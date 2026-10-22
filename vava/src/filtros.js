import { useSearchParams } from 'react-router'
import { useApi } from './api'

// Filtros comuns, com os mesmos nomes da API (spec 5.2): a query string da página vai direto para a API.
export const FILTROS = ['torneio', 'fase', 'mapa', 'time', 'agente', 'funcao']

const vazio = v => v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0)

// { filtros, setFiltro(nome, valor | null), limpar(nomes?) }. filtros = { torneio: ["Univavá"], mapa: [], … }.
// Cada mudança cria uma entrada no histórico (o botão voltar desfaz). Trocar o torneio remove a fase
// que não pertence a ele, conforme /api/filtros.
export function useFiltros() {
	const [busca, setBusca] = useSearchParams()
	const { dados: opcoes } = useApi('filtros')

	const filtros = Object.fromEntries(FILTROS.map(nome => [nome, busca.getAll(nome)]))

	function setFiltro(nome, valor) {
		const proxima = new URLSearchParams(busca)
		proxima.delete(nome)
		if (!vazio(valor)) for (const v of [valor].flat()) proxima.append(nome, v)

		if (nome === 'torneio' && opcoes) {
			const torneios = proxima.getAll('torneio')
			if (torneios.length) {
				const validas = new Set(opcoes.torneios.filter(t => torneios.includes(t.nome)).flatMap(t => t.fases))
				const fases = proxima.getAll('fase').filter(f => validas.has(f))
				proxima.delete('fase')
				for (const f of fases) proxima.append('fase', f)
			}
		}
		setBusca(proxima)
	}

	// Só os filtros pedidos (padrão: todos). A BarraFiltros limpa os campos dela: o `mapa` dos chips do Ranking
	// e do heatmap do Jogador e do Time fica.
	function limpar(nomes = FILTROS) {
		const proxima = new URLSearchParams(busca)
		for (const nome of nomes) proxima.delete(nome)
		setBusca(proxima)
	}

	return { filtros, setFiltro, limpar }
}

// [valor, setValor] para parâmetros que não são filtros: ordenar, ordem, min_rounds, min_partidas, tipo,
// lado, categoria, metrica. O valor vem como texto; voltar ao padrão tira o parâmetro da URL.
export function useParametro(nome, padrao = null) {
	const [busca, setBusca] = useSearchParams()
	const valor = busca.get(nome) ?? padrao

	function setValor(novo) {
		const proxima = new URLSearchParams(busca)
		if (vazio(novo) || String(novo) === String(padrao)) proxima.delete(nome)
		else proxima.set(nome, novo)
		setBusca(proxima)
	}

	return [valor, setValor]
}

// Vários parâmetros gravados numa única mudança (uma entrada no histórico): duas chamadas a setValor
// no mesmo evento se sobrescreveriam. padroes = { ordenar: 'acs', ordem: 'desc' } → [valores, setValores(parcial)].
export function useParametros(padroes) {
	const [busca, setBusca] = useSearchParams()
	const valores = Object.fromEntries(Object.entries(padroes).map(([nome, padrao]) => [nome, busca.get(nome) ?? padrao]))

	function setValores(parcial) {
		const proxima = new URLSearchParams(busca)
		for (const [nome, novo] of Object.entries(parcial)) {
			if (vazio(novo) || String(novo) === String(padroes[nome])) proxima.delete(nome)
			else proxima.set(nome, novo)
		}
		setBusca(proxima)
	}

	return [valores, setValores]
}
