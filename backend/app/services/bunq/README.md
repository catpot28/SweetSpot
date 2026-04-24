# services/bunq/

The BUNQ API client layer. Everything that talks to `https://public-api.sandbox.bunq.com`.

Full context: [../../../../BUNQ_INTEGRATION.md](../../../../BUNQ_INTEGRATION.md). Skip the deprecated Python SDK — we call the API directly with `httpx`.

## Responsibilities

- **Handshake** (one-time per user):
  1. `POST /v1/sandbox-user-person` → api_key
  2. `POST /v1/installation` → installation_token + server pubkey
  3. `POST /v1/device-server` → device_id (**IP-bound** — register from Railway, not laptop)
  4. `POST /v1/session-server` → session_token (~24h)
  RSA keypair generated locally; PEM + all tokens persisted (currently to JSON file, later to Supabase).
- **Request signing** — sign each request body with the user's private key (RSA PKCS#1 v1.5, SHA-256); attach `X-Bunq-Client-Authentication: <session_token>`.
- **Async client** — `BunqClient.request(method, path, body)` on top of `httpx.AsyncClient`. Auto-refreshes the session on 401.
- **Operations** — `get_user`, `get_balance`, `list_transactions`, `create_draft_payment`, `confirm_draft_payment`, `register_notification_webhook`. Pure async functions, no FastAPI coupling.

## Modules (built)

- [signing.py](signing.py) — `sign_body(private_key, body)` RSA PKCS#1 v1.5 + SHA-256
- [state.py](state.py) — `BunqState` dataclass + `StateStore` protocol + `FileStateStore`. Swap for `SupabaseStateStore` once the DB is online — same interface.
- [client.py](client.py) — `BunqClient` async context manager: per-request signing, auto session refresh on 401, `BunqApiError` for upstream failures.
- [operations.py](operations.py) — the 6 high-level operations listed above.
- [smoke.py](smoke.py) — end-to-end exerciser; runs all operations against the live sandbox using saved state.

## Reference scripts (kept for de-risk only)

- [handshake.py](handshake.py) — produces a fresh sandbox user + the JSON state file. Run via [../../../../scripts/handshake.sh](../../../../scripts/handshake.sh).
- [topup.py](topup.py) — pulls money from `sugardaddy@bunq.com`. Run via [../../../../scripts/topup.sh](../../../../scripts/topup.sh).

These will eventually be replaced by the `POST /bunq/users` route (which does its own handshake) plus a sandbox-only top-up endpoint, but they remain useful for resetting local state.

## Pending

- `register_notification_webhook` is implemented but **not exercised** — needs a public URL (Railway).
- Multi-user support — once Supabase lands, replace `FileStateStore` with `SupabaseStateStore`. No other module should need to change.
