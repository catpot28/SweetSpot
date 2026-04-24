# core/

Cross-cutting plumbing — config, logging, dependency injection. Imported by nearly everything else; depends on nothing application-specific.

## Built

- [config.py](config.py) — `pydantic-settings` `Settings` class loaded from repo-root `.env`. Currently exposes `bunq_api_base`. New keys (Supabase, Anthropic, SerpApi, ImgBB, Telegram) get added here as those services come online.
- [deps.py](deps.py) — FastAPI `Depends(...)` providers. Currently `get_bunq_client()`, an async generator that loads the JSON state file and yields a `BunqClient`. Will gain `get_db_client()` and per-user dispatch once Supabase lands.

## Pending

- `logging.py` — structured logger setup (JSON lines, request-id correlation).

All config is loaded once at startup and injected — never `os.environ.get` scattered through the codebase.
