import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="session")
def cliente():
    # O `with` dispara o lifespan: os dados são carregados uma vez para toda a sessão de testes.
    with TestClient(app) as c:
        yield c
