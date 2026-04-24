# api/

HTTP routes grouped by resource. Each subfolder exposes an `APIRouter` that `app/main.py` mounts.

- [bunq/](bunq/) — `/bunq/*` — users, balance, transactions, payments
- [telegram/](telegram/) — `/telegram/webhook` — Telegram Bot API updates
- [lens/](lens/) — `/lens/scan` — upload image, return 3-tier product matches
- [wishlist/](wishlist/) — `/wishlist/*` — CRUD for tracked items
- [webhooks/](webhooks/) — `/webhooks/bunq` — BUNQ `notification-filter-url` receiver

## Rule

Route handlers validate Pydantic input, call a service, and return a Pydantic response. No business logic here — push it down into [../services/](../services/).
