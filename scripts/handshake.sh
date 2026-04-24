#!/usr/bin/env bash
# One-shot BUNQ sandbox handshake for a fresh user — prints the balance.
# Build step 1 per BUNQ_INTEGRATION.md: de-risk the handshake before wiring anything else.
#
# Writes creds to backend/.bunq_state.json (gitignored).
# IP note: device-server is IP-bound. Creds minted from your laptop will NOT work from
# Railway — re-run this from the deploy once we ship.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if [ ! -x backend/.venv/bin/python ]; then
  echo "no venv at backend/.venv — run scripts/setup.sh first" >&2
  exit 1
fi

backend/.venv/bin/python backend/app/services/bunq/handshake.py
