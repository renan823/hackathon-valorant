FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY apps/api/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt \
    && groupadd --system app \
    && useradd --system --gid app --home-dir /app app

COPY --chown=app:app apps/api/app /app/apps/api/app
COPY --chown=app:app packages/valorant-data /app/packages/valorant-data
COPY --chown=app:app data /app/data
COPY --chown=app:app reference /app/reference

USER app

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
    CMD python -c "import json, urllib.request; response = urllib.request.urlopen('http://127.0.0.1:8000/api/saude', timeout=4); data = json.load(response); exit(0 if data.get('status') == 'ok' else 1)"

CMD ["uvicorn", "app.main:app", "--app-dir", "/app/apps/api", "--host", "0.0.0.0", "--port", "8000"]
