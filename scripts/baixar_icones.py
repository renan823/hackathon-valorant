"""Baixa os ícones de agentes e armas para vava/public/ (decisão F4 da spec do front).

Lê reference/valorant_reference.json e busca as imagens no valorant-api.com:
- agentes: displayicon.png, reduzido para 96 × 96 (o original tem ~570 KB) → vava/public/agentes/<nome>.png;
- armas fora da categoria Ability: killstreamicon.png, a silhueta do kill feed → vava/public/armas/<nome>.png.
  A faca se chama "Confronto" no JSON (pt-BR), mas a API do app a devolve como `meio = "Melee"`: o arquivo
  segue a API (melee.png).

O nome do arquivo é o nome em minúsculas, sem acentos nem símbolos (KAY/O → kayo.png); o front monta o mesmo
nome a partir do nome que vem da API. Arquivo que já existe é pulado: precisa de internet uma vez só.

    .venv/bin/python scripts/baixar_icones.py
"""

import json
import re
import unicodedata
from io import BytesIO
from pathlib import Path

import requests
from PIL import Image

RAIZ = Path(__file__).resolve().parents[1]
REFERENCIA = RAIZ / "reference" / "valorant_reference.json"
PUBLICO = RAIZ / "vava" / "public"
MIDIA = "https://media.valorant-api.com"
LADO_AGENTE = 96


def nome_arquivo(nome):
    """'KAY/O' → 'kayo.png'; 'Confronto' → 'confronto.png'."""
    sem_acento = unicodedata.normalize("NFKD", nome).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]", "", sem_acento.lower()) + ".png"


def baixar(url):
    resposta = requests.get(url, timeout=30)
    resposta.raise_for_status()
    return Image.open(BytesIO(resposta.content))


def salvar(destino, url, lado=None):
    """Baixa e grava; devolve True se baixou, False se o arquivo já existia."""
    if destino.exists():
        return False
    imagem = baixar(url)
    if lado:
        imagem = imagem.convert("RGBA").resize((lado, lado), Image.LANCZOS)
    destino.parent.mkdir(parents=True, exist_ok=True)
    imagem.save(destino, optimize=True)
    return True


def main():
    ref = json.loads(REFERENCIA.read_text(encoding="utf-8"))
    tarefas = [(PUBLICO / "agentes" / nome_arquivo(a["agente"]), f"{MIDIA}/agents/{uuid}/displayicon.png", LADO_AGENTE)
               for uuid, a in ref["agents"].items()]
    tarefas += [(PUBLICO / "armas" / nome_arquivo("Melee" if w["categoria"] == "Melee" else w["arma"]),
                 f"{MIDIA}/weapons/{uuid}/killstreamicon.png", None)
                for uuid, w in ref["weapons"].items() if w["categoria"] != "Ability"]

    baixados = falhas = 0
    for destino, url, lado in tarefas:
        try:
            if salvar(destino, url, lado):
                baixados += 1
                print(f"baixado  {destino.relative_to(RAIZ)}")
        except (requests.RequestException, OSError) as erro:
            falhas += 1
            print(f"FALHOU   {destino.relative_to(RAIZ)}: {erro}")
    print(f"{baixados} baixados, {len(tarefas) - baixados - falhas} já existiam, {falhas} falhas")


if __name__ == "__main__":
    main()
