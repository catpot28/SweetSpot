# railway/

Railway deployment notes.

## Why "Error creating build plan with Railpack" happens

Railway looks at the **repo root** for build clues (`requirements.txt`, `package.json`, `Dockerfile`). Our root has none — they live in `backend/` and `frontend/`. So Railpack can't auto-detect a build plan and bails.

Fix: tell Railway the service's source is `backend/`.

## Backend service — first-time setup

1. **Service → Settings → Source → Root Directory**: set to `backend`.
2. The repo already provides [`backend/railway.toml`](../../backend/railway.toml) with the start command:
   ```toml
   [deploy]
   startCommand = "uvicorn app.main:app --host 0.0.0.0 --port $PORT"
   ```
3. **Service → Variables** — set these (values come from your local `.env`, see [`../../.env.example`](../../.env.example)):
   - `DATABASE_URL` — Supabase Postgres URL (transaction pooler, port 6543)
   - `BUNQ_API_BASE` — `https://public-api.sandbox.bunq.com`
   - When other modules land: `SERPAPI_KEY`, `IMGBB_KEY`, `ANTHROPIC_API_KEY`, `TELEGRAM_BOT_TOKEN`
4. Redeploy. Railway picks up `requirements.txt` (Python 3.12, asyncpg, fastapi, etc.) and starts uvicorn.

## Frontend service (later)

When the frontend is scaffolded:
- Root Directory: `frontend`
- Build command: `npm run build`
- Static adapter serves `frontend/dist/`
- Var: `VITE_API_BASE_URL` = the backend service's public URL

## IP-bound device — does it apply to us?

Per [../../BUNQ_INTEGRATION.md](../../BUNQ_INTEGRATION.md), `POST /v1/device-server` is IP-bound. **For our credentials this is not an issue** — [`backend/app/services/bunq/handshake.py`](../../backend/app/services/bunq/handshake.py) registers with `permitted_ips=["*"]`, so the same row in `bunq_credentials` works from any IP (laptop, Railway, anywhere).

If you ever do a fresh handshake from a different machine without `["*"]`, you'd be locked to that IP.

## State

Railway disk is ephemeral — nothing persistent should be written there. BUNQ creds live in the Supabase `bunq_credentials` table. The asyncpg pool opens on app startup (FastAPI lifespan in [`../../backend/app/main.py`](../../backend/app/main.py)).

## Webhook registration

Once Railway gives you a public URL (something like `https://sweetspot-production.up.railway.app`), call `services.bunq.operations.register_notification_webhook(client, url=PUBLIC_URL + "/webhooks/bunq")` once to tell BUNQ to push events there. Currently no route or hook does this automatically; add an admin endpoint or a one-off script when needed.
