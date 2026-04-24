#!/usr/bin/env bash
# Copy backend/.bunq_state.json into the bunq_credentials Supabase table.
# Idempotent — re-runs cleanly. Run after scripts/handshake.sh produced a
# state file but before booting the FastAPI server (which reads from DB now).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT/backend"

if [ ! -x .venv/bin/python ]; then
  echo "no venv at backend/.venv — run scripts/setup.sh first" >&2
  exit 1
fi

exec .venv/bin/python -m app.db.migrate_state
