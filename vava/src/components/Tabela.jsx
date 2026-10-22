import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { corQualidade, formatar, rotulo } from '../formatos'
import './Tabela.css'

// Tabela de dados (spec 6.4 e 6.6). Cada coluna:
//   { chave, rotulo?, formato?(valor, linha), cor?, link?(linha), alinhar?, interativo?, ordenavel? }
// - rótulo e valor saem de rotulo(chave) e formatar(chave, valor) quando não vêm na coluna;
// - cor: true pinta pelo corQualidade (--bom/--ruim);
// - link(linha) torna a linha clicável. A célula dessa coluna tem o link de verdade (focável); as outras
//   ganham uma cópia fora da ordem do Tab, porque a primeira coluna é sticky e um link "estendido" por
//   CSS não passaria dela. Colunas com links próprios (interativo: true) ficam sem a cópia.
// Ordenação: no cliente por padrão (decrescente no 1º clique, nulos sempre por último), ou no servidor
// passando `ordenacao` + `onOrdenar({ coluna, ordem })`.
// `alturaMax` (ex.: "70vh") dá rolagem vertical própria, e só então o cabeçalho gruda no topo.
// `classeLinha(linha)` acrescenta uma classe à linha (ex.: amostra pequena esmaecida).
function Tabela({ linhas, colunas, chave = (_, i) => i, ordenacao, onOrdenar, ordenacaoInicial = null, alturaMax, legenda, classeLinha }) {
	const [local, setLocal] = useState(ordenacaoInicial)
	const servidor = typeof onOrdenar === 'function'
	const atual = servidor ? ordenacao : local

	const linkDaLinha = colunas.find(c => c.link)?.link

	function ordenar(coluna) {
		const proxima = atual?.coluna === coluna
			? { coluna, ordem: atual.ordem === 'desc' ? 'asc' : 'desc' }
			: { coluna, ordem: 'desc' }
		if (servidor) onOrdenar(proxima)
		else setLocal(proxima)
	}

	const visiveis = servidor || !atual ? linhas : ordenarLinhas(linhas, atual)

	return (
		<div className="tabela rolagem-x" style={alturaMax ? { maxHeight: alturaMax, overflowY: 'auto' } : undefined}>
			<table>
				{legenda && <caption className="sr-only">{legenda}</caption>}
				<thead>
					<tr>
						{colunas.map(c => {
							const ativa = atual?.coluna === c.chave
							const alinhamento = alinharDe(c, linhas)
							return (
								<th
									key={c.chave}
									scope="col"
									className={`tabela__th--${alinhamento}`}
									aria-sort={ativa ? (atual.ordem === 'desc' ? 'descending' : 'ascending') : undefined}
								>
									{c.ordenavel === false ? (c.rotulo ?? rotulo(c.chave)) : (
										<button className="tabela__ordenar" onClick={() => ordenar(c.chave)}>
											{c.rotulo ?? rotulo(c.chave)}
											{ativa && (atual.ordem === 'desc' ? <ArrowDown size={12} /> : <ArrowUp size={12} />)}
										</button>
									)}
								</th>
							)
						})}
					</tr>
				</thead>
				<tbody>
					{visiveis.map((linha, i) => {
						const destino = linkDaLinha?.(linha)
						return (
							<tr key={chave(linha, i)} className={[destino && 'tabela__linha--link', classeLinha?.(linha)].filter(Boolean).join(' ') || undefined}>
								{colunas.map(c => {
									const valor = linha[c.chave]
									const conteudo = c.formato ? c.formato(valor, linha) : formatar(c.chave, valor)
									const qualidade = c.cor ? corQualidade(c.chave, valor) : null
									const classes = [`tabela__td--${alinharDe(c, linhas)}`, qualidade, typeof valor === 'number' && 'numero'].filter(Boolean).join(' ')
									let celula = conteudo
									if (destino && c.link) celula = <Link className="tabela__link" to={destino}>{conteudo}</Link>
									else if (destino && !c.interativo) celula = <Link className="tabela__link" to={destino} tabIndex={-1} aria-hidden="true">{conteudo}</Link>
									return <td key={c.chave} className={classes}>{celula}</td>
								})}
							</tr>
						)
					})}
				</tbody>
			</table>
		</div>
	)
}

// Números à direita, o resto à esquerda, salvo `alinhar` explícito.
function alinharDe(coluna, linhas) {
	if (coluna.alinhar) return coluna.alinhar
	const exemplo = linhas.find(l => l[coluna.chave] !== null && l[coluna.chave] !== undefined)?.[coluna.chave]
	return typeof exemplo === 'number' ? 'direita' : 'esquerda'
}

const comparador = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' })

function ordenarLinhas(linhas, { coluna, ordem }) {
	const sinal = ordem === 'desc' ? -1 : 1
	return [...linhas].sort((a, b) => {
		const x = a[coluna], y = b[coluna]
		const xVazio = x === null || x === undefined, yVazio = y === null || y === undefined
		if (xVazio || yVazio) return xVazio === yVazio ? 0 : xVazio ? 1 : -1 // nulos por último
		if (typeof x === 'number' && typeof y === 'number') return sinal * (x - y)
		return sinal * comparador.compare(String(x), String(y))
	})
}

export default Tabela
