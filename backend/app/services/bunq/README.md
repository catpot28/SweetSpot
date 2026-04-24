# services/bunq/

The BUNQ API client layer. Everything that talks to `https://public-api.sandbox.bunq.com`.

Full context: [../../../../BUNQ_INTEGRATION.md](../../../../BUNQ_INTEGRATION.md).

## Responsibilities

- **Handshake** (one-time per user):
  1. `POST /v1/sandbox-user-person` → api_key
  2. `POST /v1/installation` → installation_token + server pubkey
  3. `POST /v1/device-server` → device_id (**IP-bound** — register from Railway, not laptop)
  4. `POST /v1/session-server` → session_token (~24h)
  RSA keypair generated locally; PEM + all tokens persisted to Supabase.
- **Request signing** — sign each request body with the user's private key (RSA PKCS#1 v1.5, SHA-256); attach `X-Bunq-Client-Authentication: <session_token>`.
- **Async client** — `BunqClient.request(method, path, body)` on top of `httpx.AsyncClient`. Auto-refreshes the session on `401`.
- **Webhook registration** — `PUT /v1/user/{uid}/notification-filter-url` so BUNQ pushes to `/webhooks/bunq`.

## Deliverables

- `client.py` — `BunqClient` class
- `handshake.py` — the 4-step sandbox handshake
- `signing.py` — request signing helpers
- `keys.py` — RSA keypair generation

**Skip the deprecated Python SDK** — call the API directly with httpx.
