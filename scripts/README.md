# scripts/

Bash helpers for local dev and one-off operational tasks. All scripts assume they are run from the repo root.

## Files

- [setup.sh](setup.sh) — one-time: create the backend Python venv, install backend deps, install frontend deps, bootstrap `.env` from `.env.example`. Safe to re-run.
- [dev-backend.sh](dev-backend.sh) — run FastAPI locally with auto-reload (`uvicorn app.main:app --reload`).
- [dev-frontend.sh](dev-frontend.sh) — run the Vite dev server for the React PWA.
- [handshake.sh](handshake.sh) — run a one-shot BUNQ sandbox handshake for a single hardcoded user and print the balance. This is **build step 1** per [../BUNQ_INTEGRATION.md](../BUNQ_INTEGRATION.md) — de-risk the handshake before wiring anything else.

## Convention

Every script is executable (`chmod +x`), uses `set -euo pipefail`, and starts with a 1–2 line comment explaining what it does. No silent side effects.
