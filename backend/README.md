# Backend — FastAPI service

Python 3.12, FastAPI. A single service that:

- Wraps the BUNQ REST API: handshake, signing, balance, transactions, payments, webhook registration.
- Runs the sweet-spot algorithm on a schedule and on every inbound BUNQ webhook.
- Terminates the Telegram bot webhook and drives the bot flow.
- Calls SerpApi / ImgBB / Anthropic for the image pipeline and affordability reasoning.
- Serves REST for the React frontend.

## Structure

- [app/](app/) — application package (routers, services, db, core)
- [tests/](tests/) — pytest suite
- [requirements.txt](requirements.txt) — pinned deps (fill in as modules get built)

## Runtime

- Python **3.12**
- Local dev: `uvicorn app.main:app --reload` (see [../scripts/dev-backend.sh](../scripts/dev-backend.sh))
- Deployed to Railway; per-user state persisted to Supabase because Railway disk is ephemeral — see [../BUNQ_INTEGRATION.md](../BUNQ_INTEGRATION.md).

## Entry points

- `app.main:app` — the `FastAPI()` instance; mounts every router under [app/api/](app/api/).
- Webhooks: `/webhooks/bunq`, `/telegram/webhook`.
