#!/usr/bin/env bash
# Runs the FastAPI backend locally with auto-reload.
# Expects: Python 3.12 venv at backend/.venv with requirements installed (see setup.sh).
# Loads env vars from .env at the repo root via pydantic-settings.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT/backend"

if [ ! -x .venv/bin/uvicorn ]; then
  echo "no uvicorn in backend/.venv — run scripts/setup.sh first" >&2
  exit 1
fi

exec .venv/bin/uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
