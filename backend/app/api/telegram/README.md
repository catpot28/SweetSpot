# api/telegram/

Telegram bot entry point. Webhook-only (no long polling).

## Endpoint

- `POST /telegram/webhook` — receives updates from the Telegram Bot API.

## Flow

1. Parse the incoming update (`message`, `callback_query`, etc.).
2. Dispatch on command or callback data:
   - `/start` — first-time handshake (creates a BUNQ sandbox user via `POST /bunq/users`).
   - photo message — forward to `/lens/scan`, reply with 3-tier results as inline buttons.
   - `/wishlist` — show tracked items with status badges.
3. Reply via `api.telegram.org` using the token from `TELEGRAM_BOT_TOKEN`.

Keep command handlers thin — delegate business logic to `services/`.
