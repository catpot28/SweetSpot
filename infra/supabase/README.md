# supabase/

Supabase project (Postgres + auth + storage).

## Purpose

Source of truth for all per-user state: BUNQ credentials, wishlist items, daily price snapshots. Railway disk is ephemeral, so nothing long-lived lives on the backend host.

## Schema

The actual SQL lives as migrations in [../../backend/app/db/migrations/](../../backend/app/db/migrations/) so it sits next to the repositories that use it. Apply via the Supabase SQL editor, or `supabase db push` once the Supabase CLI is wired up.

## Secrets

`SUPABASE_URL` and `SUPABASE_KEY` land in the backend's env (see [../../.env.example](../../.env.example) and [../railway/](../railway/)). Use the **service role** key on the backend — the anon key does not have the access we need for cross-user state.
