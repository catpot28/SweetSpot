#!/usr/bin/env bash
# One-time local setup:
#   - creates a Python 3.12 venv at backend/.venv
#   - installs backend requirements into it
#   - bootstraps .env from .env.example if missing
# Safe to re-run.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

PY="${PYTHON:-python3.12}"
if ! command -v "$PY" >/dev/null 2>&1; then
  echo "need $PY on PATH (override with PYTHON=/path/to/python3.12)" >&2
  exit 1
fi

if [ ! -d backend/.venv ]; then
  "$PY" -m venv backend/.venv
fi

# shellcheck disable=SC1091
source backend/.venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt

if [ ! -f .env ]; then
  cp .env.example .env
  echo "created .env from template — fill in keys before running dev scripts"
fi

echo "setup OK"
