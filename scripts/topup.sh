#!/usr/bin/env bash
# Top up the sandbox account via sugardaddy@bunq.com (see BUNQ_INTEGRATION.md).
# Requires prior scripts/handshake.sh run (reads backend/.bunq_state.json).
#
# Usage:
#   scripts/topup.sh           # tops up 50.00 EUR (default)
#   scripts/topup.sh 100.00    # tops up a custom amount

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if [ ! -x backend/.venv/bin/python ]; then
  echo "no venv at backend/.venv — run scripts/setup.sh first" >&2
  exit 1
fi

backend/.venv/bin/python backend/app/services/bunq/topup.py "${1:-50.00}"
