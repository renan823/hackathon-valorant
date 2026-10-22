import { useEffect, useState } from 'react'

// Os dados não mudam enquanto o backend roda: o cache não precisa de invalidação (spec 5.1).
const cache = new Map()      // url → Promise com o JSON (compartilhada por quem pede a mesma URL)
const resolvidos = new Map() // url → JSON já recebido, lido direto na renderização (sem piscar "carregando")

export class ErroApi extends Error {
	constructor(status, mensagem) {
		super(mensagem)
		this.status = status // 0 = falha de rede
		this.mensagem = mensagem
	}
}

// "/api/<caminho>?…": chaves ordenadas (a mesma consulta gera a mesma chave de cache),
// arrays viram parâmetros repetidos e valores vazios (null, undefined, "", []) são omitidos.
export function urlApi(caminho, params = {}) {
	const busca = new URLSearchParams()
	for (const chave of Object.keys(params).sort()) {
		const valores = [params[chave]].flat()
		for (const v of valores) {
			if (v !== null && v !== undefined && v !== '') busca.append(chave, v)
		}
	}
	const qs = busca.toString()
	return `/api/${caminho}${qs ? `?${qs}` : ''}`
}

async function pedir(url) {
	let resposta
	try {
		resposta = await fetch(url)
	} catch {
		throw new ErroApi(0, 'Sem conexão com o backend')
	}
	if (!resposta.ok) {
		// O FastAPI devolve {"detail": "..."}; o proxy do Vite, com o backend fora, devolve 502 vazio.
		let mensagem = resposta.statusText || `Erro ${resposta.status}`
		try {
			const corpo = await resposta.json()
			if (typeof corpo.detail === 'string') mensagem = corpo.detail
		} catch { /* corpo vazio ou não-JSON */ }
		throw new ErroApi(resposta.status, mensagem)
	}
	return resposta.json()
}

// Promise<json>. Erro não fica no cache: a próxima chamada tenta de novo.
export function buscar(caminho, params) {
	return buscarUrl(urlApi(caminho, params))
}

function buscarUrl(url) {
	if (!cache.has(url)) {
		const promessa = pedir(url).then(
			dados => { resolvidos.set(url, dados); return dados },
			erro => { cache.delete(url); throw erro },
		)
		cache.set(url, promessa)
	}
	return cache.get(url)
}

// Falha de rede ou proxy sem backend (F10). Um 500 do FastAPI é bug, não queda.
export function foraDoAr(erro) {
	return [0, 502, 503, 504].includes(erro?.status)
}

// { dados, erro, carregando, recarregar }. Com caminho null não busca.
// Resultado que chega depois de desmontar ou de mudar os parâmetros é descartado; a requisição
// não é abortada, porque fica no cache e serve à próxima visita (plano, seção 2).
export function useApi(caminho, params) {
	const url = caminho === null ? null : urlApi(caminho, params)
	const [estado, setEstado] = useState({ url: null, tentativa: 0, dados: undefined, erro: null })
	const [tentativa, setTentativa] = useState(0)

	useEffect(() => {
		if (url === null || resolvidos.has(url)) return
		let vivo = true
		buscarUrl(url)
			.then(
				dados => vivo && setEstado({ url, tentativa, dados, erro: null }),
				erro => vivo && setEstado({ url, tentativa, dados: undefined, erro }),
			)
		return () => { vivo = false }
	}, [url, tentativa])

	const recarregar = () => setTentativa(t => t + 1)
	if (url === null) return { dados: undefined, erro: null, carregando: false, recarregar }
	if (resolvidos.has(url)) return { dados: resolvidos.get(url), erro: null, carregando: false, recarregar }
	const atual = estado.url === url && estado.tentativa === tentativa
	return {
		dados: atual ? estado.dados : undefined,
		erro: atual ? estado.erro : null,
		carregando: !atual,
		recarregar,
	}
}

// Várias respostas de useApi como uma só, para um único <Estado>: dados = lista na mesma ordem.
export function juntarRespostas(...respostas) {
	const erro = respostas.find(r => r.erro)?.erro ?? null
	return {
		dados: respostas.every(r => r.dados) ? respostas.map(r => r.dados) : undefined,
		erro,
		carregando: !erro && respostas.some(r => r.carregando),
		recarregar: () => respostas.forEach(r => r.erro && r.recarregar()),
	}
}
