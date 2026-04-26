# BUNQ Lens — SweetSpot

**Scan products, track wishes, buy when finances align.**

A mobile-first PWA integrated with BunqAPI featuring camera/screenshot capture product search, price tracking and smart wishlist management. 
Features: 
* GoogleLens and produc search integration via SerpAPI
* LLM reasoning for human-readable reasoning 
* SweetSpot heuristic algorithm for bying opportunity detection based on spending data
* BunqAPI integration via Bunq Python SDK

## V2(TODO):
Wishlist management improvement 
Push notifications and screenshot upload flow implementation
SerpAPI response filtering 
SweetSpot algorithm improvement

## Design docs

Three existing docs at the repo root explain the project. Read them before touching code:

- [bunq-lens-product-concept.md](bunq-lens-product-concept.md) — product vision, three-layer architecture, user journey
- [STACK.md](STACK.md) — full tech stack
- [BUNQ_INTEGRATION.md](BUNQ_INTEGRATION.md) — BUNQ sandbox API handshake, signing, state storage

## Repo layout

- [frontend/](frontend/) — React 18 + TypeScript + Vite + Tailwind PWA (camera, wishlist UI)
- [backend/](backend/) — FastAPI (Python 3.12) service: BUNQ client, SerpApi/ImgBB/Anthropic integrations, sweet-spot algorithm, Telegram bot webhook
- [scripts/](scripts/) — bash helpers for local dev and one-off tasks
- [infra/](infra/) — deployment config (Railway) and Supabase schema notes

Every folder has its own `README.md` describing what lives there and what is planned.

## Runtime

- **Python:** 3.12 (backend)
- **Node:** LTS (frontend)
- **Deploy target:** Railway (two services)
- **State:** Supabase (Railway disk is ephemeral)

## Quick start

1. Copy [.env.example](.env.example) to `.env` and fill in keys (BUNQ, `DATABASE_URL`, etc.).
2. `./scripts/setup.sh` — creates the Python 3.12 venv at `backend/.venv`, installs deps.
3. `./scripts/handshake.sh` — runs the BUNQ sandbox handshake, saves creds to `backend/.bunq_state.json`.
4. `./scripts/migrate-state-to-db.sh` — copies that state into the `bunq_credentials` Supabase table (the FastAPI server reads from DB).
5. `./scripts/dev-backend.sh` — runs FastAPI at `http://127.0.0.1:8000` (try `/docs` for Swagger).
6. `./scripts/dev-frontend.sh` — Vite dev server (frontend not scaffolded yet).

## Status

| Layer | State |
|---|---|
| BUNQ integration (client, signing, 5 routes) | **Built** — verified end-to-end against the sandbox |
| Supabase persistence (`bunq_credentials` + product-side tables) | **Built** — schema in [`infra/supabase/schema.sql`](infra/supabase/schema.sql), live, FastAPI reads from DB |
| Telegram bot webhook |**Needs Revision** |
| Lens pipeline (ImgBB + SerpApi) | **Built** |
| Sweet-spot algorithm | **V2** |
| Anthropic reasoning | **Built** |
| Frontend (React PWA) | **Built** |
| Railway deploy |  **Live** |

## Build order



Follow the staging in [BUNQ_INTEGRATION.md](BUNQ_INTEGRATION.md). De-risk the BUNQ handshake first — everything else depends on it. Steps 1–3 (handshake → client → routes) are done.
