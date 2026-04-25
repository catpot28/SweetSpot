# Backend — FastAPI service

Python 3.12, FastAPI. A single service that:

- Wraps the BUNQ REST API: handshake, signing, balance, transactions, payments, webhook registration.
- Runs the sweet-spot algorithm on a schedule and on every inbound BUNQ webhook.
- Terminates the Telegram bot webhook and drives the bot flow.
- Calls SerpApi / ImgBB / Anthropic for the image pipeline and affordability reasoning.
- Serves REST for the React frontend.

## Structure

- [app/](app/) — application package (routers, services, db, core)
- [tests/](tests/) — pytest suite (no tests yet)
- [requirements.txt](requirements.txt) — current deps: `httpx`, `cryptography`, `fastapi`, `uvicorn[standard]`, `pydantic-settings`. More land as modules come online.

## Runtime

- Python **3.12** (pinned via repo-root `.python-version`)
- Local dev: `uvicorn app.main:app --reload` (see [../scripts/dev-backend.sh](../scripts/dev-backend.sh))
- BUNQ creds persisted in Supabase (`bunq_credentials` table). Bootstrap flow is `scripts/handshake.sh` → `scripts/migrate-state-to-db.sh` → `scripts/dev-backend.sh`.

## Entry points

- `app.main:app` — the `FastAPI()` instance; mounts routers under [app/api/](app/api/). Lifespan opens/closes the asyncpg pool.
- Currently mounted: `/health`, `/bunq/*` (5 routes). Telegram, Lens, Wishlist, BUNQ webhook receiver — pending.

## Status

- **Built:** `app/services/bunq/` (client + signing + state + 6 operations), `app/api/bunq/` (5 routes), `app/core/config.py`, `app/core/deps.py`, `app/main.py`, `app/db/` (asyncpg pool + bunq_credentials repo + state migration).
- **Pending:** everything under `app/api/{telegram,lens,wishlist,webhooks}/`, `app/services/{serpapi,imgbb,anthropic,sweetspot}/`, repos for product-side tables, `app/core/logging.py`.
