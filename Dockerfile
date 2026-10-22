# Imagem única para o Hugging Face Spaces: builda o front e serve tudo pelo FastAPI.
FROM node:22-slim AS web
WORKDIR /web
COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm ci
COPY apps/web/ ./
RUN npm run build

FROM python:3.12-slim
# O Spaces roda o container com o usuário 1000.
RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH" PYTHONUNBUFFERED=1
WORKDIR /home/user/app

COPY --chown=user apps/api/requirements.txt apps/api/requirements.txt
RUN pip install --no-cache-dir --user -r apps/api/requirements.txt

COPY --chown=user packages/ packages/
COPY --chown=user reference/ reference/
COPY --chown=user data/ data/
COPY --chown=user apps/api/ apps/api/
COPY --chown=user --from=web /web/dist apps/web/dist

EXPOSE 7860
CMD ["uvicorn", "app.main:app", "--app-dir", "apps/api", "--host", "0.0.0.0", "--port", "7860"]
