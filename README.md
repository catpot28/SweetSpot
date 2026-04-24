# BUNQ Lens — SweetSpot

**Scan products, track wishes, buy when finances align.**

A mobile-first PWA + Telegram bot that watches both what you want and what you can afford, then nudges you when the two align.

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

1. Copy [.env.example](.env.example) to `.env` and fill in the keys.
2. `./scripts/setup.sh` — create venv, install deps (once implemented).
3. `./scripts/dev-backend.sh` — run FastAPI locally.
4. `./scripts/dev-frontend.sh` — run Vite dev server.

## Build order

Follow the staging in [BUNQ_INTEGRATION.md](BUNQ_INTEGRATION.md). De-risk the BUNQ handshake first — everything else depends on it.
