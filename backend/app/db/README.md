# db/

Supabase (PostgreSQL) access layer. Per [../../../BUNQ_INTEGRATION.md](../../../BUNQ_INTEGRATION.md), Railway disk is ephemeral — all persistent state lives here.

## Built

- [client.py](client.py) — `asyncpg` connection pool, lifespan-managed by `app.main`. Single `get_pool()` accessor; `init_pool()` / `close_pool()` called from FastAPI startup/shutdown. Connects to Supabase's transaction pooler (port 6543) with `statement_cache_size=0` and `ssl='require'`.
- [bunq_credentials_repo.py](bunq_credentials_repo.py) — repository for the `bunq_credentials` table. Lookups: `get_by_id`, `get_by_user`, `get_by_bunq_user_id`, `get_first_id`. Writes: `upsert_by_bunq_user_id`, `update_session_token`. Returns `BunqState` instances; callers don't see raw rows.
- [migrate_state.py](migrate_state.py) — one-off: copies `backend/.bunq_state.json` into the table. Idempotent, run via [../../../scripts/migrate-state-to-db.sh](../../../scripts/migrate-state-to-db.sh).

## Pending

- Repos for the product-side tables (`product_searches`, `wishlists`, `wishlist_items`, `offer_price_history`, `product_offers`, …). Schema exists in [../../../infra/supabase/schema.sql](../../../infra/supabase/schema.sql), but no Python access layer yet.

## Schema

DDL is in [../../../infra/supabase/schema.sql](../../../infra/supabase/schema.sql) — single idempotent file (`IF NOT EXISTS` everywhere). Apply via the Supabase SQL editor or `python -c "...await conn.execute(...)"` against the live DB.
