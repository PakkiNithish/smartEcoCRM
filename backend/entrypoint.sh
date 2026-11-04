#!/bin/sh
set -e

echo "==> Running database migrations (Alembic)..."
alembic -c alembic.ini upgrade head

echo "==> Starting Gunicorn with Uvicorn ASGI workers..."
exec gunicorn -w 4 -k uvicorn.workers.UvicornWorker backend.app.main:app --bind 0.0.0.0:8000
