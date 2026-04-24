# migrations/

SQL files applied to the Supabase Postgres database. Numbered prefixes so order is obvious: `001_users.sql`, `002_wishlist.sql`, `003_price_history.sql`.

## Initial schema

- **users** — `telegram_user_id` PK, BUNQ credentials: `api_key`, `private_key_pem`, `installation_token`, `device_id`, `session_token`, `session_expires_at`.
- **wishlist** — per-user items: `id`, `telegram_user_id` FK, `title`, `anchor_price`, `current_price`, `image_url`, `product_url`, `tier`, `created_at`.
- **price_history** — daily snapshots keyed by `wishlist_item_id`, `observed_at`, `price`.

## Applying

- Local: paste into the Supabase SQL editor.
- Later: `supabase db push` once the Supabase CLI is wired up.
- Never edit a migration after it has run in a shared environment — add a new one.
