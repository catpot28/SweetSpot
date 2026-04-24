# db/

Supabase (PostgreSQL) access layer. Per [../../../BUNQ_INTEGRATION.md](../../../BUNQ_INTEGRATION.md), Railway disk is ephemeral — all persistent state lives here.

## Layout

- `client.py` (to be created) — Supabase client singleton
- `users_repo.py` — per-user BUNQ credentials + session
- `wishlist_repo.py` — tracked items with anchor prices
- `price_history_repo.py` — daily price snapshots
- [migrations/](migrations/) — SQL schema

## Why repositories

Keep raw Supabase queries out of `api/` and `services/`. Repos return typed Python objects, accept typed inputs, and are easy to mock in tests.
