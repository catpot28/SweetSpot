# scripts/

Bash helpers for local dev and one-off operational tasks. All scripts assume they are run from the repo root.

## Files

- [setup.sh](setup.sh) — one-time: create the backend Python venv at `backend/.venv`, install deps, bootstrap `.env` from `.env.example`. Safe to re-run.
- [handshake.sh](handshake.sh) — one-shot BUNQ sandbox handshake; mints a fresh user and writes credentials to `backend/.bunq_state.json` (gitignored). Required before the migrate step.
- [migrate-state-to-db.sh](migrate-state-to-db.sh) — copies `backend/.bunq_state.json` into the `bunq_credentials` Supabase table. Idempotent (re-run safely). Required before booting the FastAPI server, which reads creds from DB.
- [topup.sh](topup.sh) — pulls money from `sugardaddy@bunq.com` to fund the sandbox user. Default 50 EUR; pass an amount as `$1` for custom (e.g. `scripts/topup.sh 100.00`).
- [dev-backend.sh](dev-backend.sh) — run FastAPI locally with auto-reload on `http://127.0.0.1:8000`. Swagger UI at `/docs`.
- [dev-frontend.sh](dev-frontend.sh) — run the Vite dev server (frontend not scaffolded yet).

## Convention

Every script is executable (`chmod +x`), uses `set -euo pipefail`, and starts with a 1–2 line comment explaining what it does. No silent side effects.
