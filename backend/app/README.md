# app/

FastAPI application package. [main.py](main.py) wires routers into a single `FastAPI()` instance and runs CORS + error handlers.

## Subpackages

- [api/](api/) — HTTP route handlers, one folder per resource
- [services/](services/) — external API clients and domain logic (BUNQ, SerpApi, ImgBB, Anthropic, sweet-spot algorithm)
- [db/](db/) — Supabase client + repositories
- [core/](core/) — config, logging, shared dependencies

## Conventions

- Route modules stay thin: validate input → call a service → return a response.
- Services are stateless; they get credentials from `core/config`.
- No cross-imports between `services/` and `api/` — `api/` depends on `services/`, never the other way around.

## Status

- **Built:** `main.py`, `services/bunq/`, `api/bunq/`, `core/config.py`, `core/deps.py`.
- **Pending:** `services/{serpapi,imgbb,anthropic,sweetspot}/`, `api/{telegram,lens,wishlist,webhooks}/`, `db/`, `core/logging.py`.
