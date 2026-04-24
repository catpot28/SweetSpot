# core/

Cross-cutting plumbing — config, logging, dependency injection. Imported by nearly everything else; depends on nothing application-specific.

## Planned modules

- `config.py` — `pydantic-settings` loader for env vars: `BUNQ_API_BASE`, `SUPABASE_URL`, `SUPABASE_KEY`, `SERPAPI_KEY`, `IMGBB_KEY`, `ANTHROPIC_API_KEY`, `TELEGRAM_BOT_TOKEN`. One `Settings` instance reused across the app.
- `logging.py` — structured logger setup (JSON lines, request-id correlation).
- `deps.py` — FastAPI `Depends(...)` providers: Supabase client, `BunqClient` factory keyed by user, current-user resolver.

All config is loaded once at startup and injected — never `os.environ.get` scattered through the codebase.
