"""API do dashboard VAVA Stats (docs/backend/spec.md).

Execução, a partir da raiz do repositório:
    .venv/bin/uvicorn app.main:app --reload --app-dir apps/api --port 8000
"""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app import dados
from app.routers import analises, geral, jogadores, partidas, times


@asynccontextmanager
async def lifespan(app):
    # Os JSONs são lidos uma única vez; todas as requisições usam dados.BASE em memória.
    dados.carregar()
    yield


app = FastAPI(title="VAVA Stats API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

for modulo in (geral, jogadores, times, partidas, analises):
    app.include_router(modulo.router, prefix="/api")

# Em produção (Dockerfile / Hugging Face Spaces) o mesmo processo serve o build do front;
# em desenvolvimento o dist/ não existe e quem serve o front é o Vite.
DIST = Path(__file__).resolve().parents[2] / "web" / "dist"

if DIST.is_dir():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{caminho:path}", include_in_schema=False)
    def front(caminho: str):
        if caminho.startswith("api/"):
            raise HTTPException(404, "Rota não encontrada")
        arquivo = (DIST / caminho).resolve()
        if caminho and arquivo.is_file() and DIST in arquivo.parents:
            return FileResponse(arquivo)
        # Rotas do react-router (/jogadores/..., /times/...) caem no index.html.
        return FileResponse(DIST / "index.html")
