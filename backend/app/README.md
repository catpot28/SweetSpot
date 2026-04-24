# app/

FastAPI application package. `main.py` (to be created) wires routers into a single `FastAPI()` instance.

## Subpackages

- [api/](api/) — HTTP route handlers, one folder per resource
- [services/](services/) — external API clients and domain logic (BUNQ, SerpApi, ImgBB, Anthropic, sweet-spot algorithm)
- [db/](db/) — Supabase client + repositories
- [core/](core/) — config, logging, shared dependencies

## Conventions

- Route modules stay thin: validate input → call a service → return a response.
- Services are stateless; they get credentials from `core/config`.
- No cross-imports between `services/` and `api/` — `api/` depends on `services/`, never the other way around.
