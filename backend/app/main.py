"""API do dashboard VAVA Stats (docs/backend/spec.md).

Execução, a partir da raiz do repositório:
    .venv/bin/uvicorn app.main:app --reload --app-dir backend --port 8000
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
