# services/bunq/

The BUNQ API client layer. Everything that talks to `https://public-api.sandbox.bunq.com`.

Full context: [../../../../BUNQ_INTEGRATION.md](../../../../BUNQ_INTEGRATION.md). Skip the deprecated Python SDK — we call the API directly with `httpx`.

## Responsibilities

- **Handshake** (one-time per user):
  1. `POST /v1/sandbox-user-person` → api_key
  2. `POST /v1/installation` → installation_token + server pubkey
  3. `POST /v1/device-server` → device_id (**IP-bound** — register from Railway, not laptop)
  4. `POST /v1/session-server` → session_token (~24h)
  RSA keypair generated locally; PEM + all tokens persisted (currently to JSON file by the reference script, then migrated to Supabase).
- **Request signing** — sign each request body with the user's private key (RSA PKCS#1 v1.5, SHA-256); attach `X-Bunq-Client-Authentication: <session_token>`.
- **Async client** — `BunqClient.request(method, path, body)` on top of `httpx.AsyncClient`. Auto-refreshes the session on 401 and persists the new token via the configured `StateStore`.
- **Operations** — `get_user`, `get_balance`, `list_transactions`, `create_draft_payment`, `confirm_draft_payment`, `register_notification_webhook`. Pure async functions, no FastAPI coupling.

## Modules (built)

- [signing.py](signing.py) — `sign_body(private_key, body)` RSA PKCS#1 v1.5 + SHA-256
- [state.py](state.py) — `BunqState` dataclass + async `StateStore` protocol + two implementations:
  - `FileStateStore(path)` — single-user JSON file (for handshake reference scripts and as fallback).
  - `DbStateStore(pool, row_id)` — Supabase-backed via `app.db.bunq_credentials_repo`. The FastAPI server uses this.
- [client.py](client.py) — `BunqClient` async context manager: per-request signing, auto session refresh on 401, `BunqApiError` for upstream failures.
- [operations.py](operations.py) — the 6 high-level operations listed above.
- [smoke.py](smoke.py) — end-to-end exerciser; runs all operations against the live sandbox using saved state.

## Reference scripts (de-risk only, kept for resetting state)

- [handshake.py](handshake.py) — produces a fresh sandbox user + the JSON state file. Run via [../../../../scripts/handshake.sh](../../../../scripts/handshake.sh).
- [topup.py](topup.py) — pulls money from `sugardaddy@bunq.com`. Run via [../../../../scripts/topup.sh](../../../../scripts/topup.sh).

After handshake, copy the state into the DB with [../../../../scripts/migrate-state-to-db.sh](../../../../scripts/migrate-state-to-db.sh) before running the FastAPI server (which reads from `bunq_credentials`, not the JSON file).

## Pending

- `register_notification_webhook` is implemented but **not exercised** — needs a public URL (Railway).
- Multi-user — `DbStateStore` is keyed by row UUID; once Telegram onboarding lands, the request dependency will resolve the row from `auth.users.id`.
