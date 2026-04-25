# core/

Cross-cutting plumbing — config, logging, dependency injection. Imported by nearly everything else; depends on nothing application-specific.

## Built

- [config.py](config.py) — `pydantic-settings` `Settings` loaded from repo-root `.env`. Currently exposes `bunq_api_base` and `database_url` (`SecretStr`). New keys (Anthropic, SerpApi, ImgBB, Telegram) get added here as those services come online.
- [deps.py](deps.py) — FastAPI `Depends(...)` providers. `get_bunq_client()` looks up the most-recently-created row in `bunq_credentials`, builds a `DbStateStore`, and yields a `BunqClient` per request. Once Telegram onboarding lands it'll resolve the row by `auth.users.id` instead.

## Pending

- `logging.py` — structured logger setup (JSON lines, request-id correlation).
- Per-user dispatch in `get_bunq_client` (currently single-user fallback).

All config is loaded once at startup and injected — never `os.environ.get` scattered through the codebase.
