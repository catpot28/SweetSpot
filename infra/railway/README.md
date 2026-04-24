# railway/

Railway deployment notes.

## Services

Two services in one Railway project:

- **backend** — FastAPI, Python 3.12 builder, start command `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
- **frontend** — Vite build → static assets served via Railway's static adapter.

## Required env vars

See [../../.env.example](../../.env.example). Set on the **backend** service:

- `BUNQ_API_BASE=https://public-api.sandbox.bunq.com`
- `SUPABASE_URL`, `SUPABASE_KEY`
- `SERPAPI_KEY`, `IMGBB_KEY`
- `ANTHROPIC_API_KEY`
- `TELEGRAM_BOT_TOKEN`

And on the **frontend** service:

- `VITE_API_BASE_URL` — the public URL of the backend service

## IP-bound handshake

Per [../../BUNQ_INTEGRATION.md](../../BUNQ_INTEGRATION.md), the BUNQ `POST /v1/device-server` call binds to the caller's IP. **Run the handshake from the Railway deploy**, not a laptop, or subsequent BUNQ calls from production will `403`.

## State

Railway disk is ephemeral. Nothing persistent should be written there — all per-user state goes to Supabase.
