# api/

HTTP routes grouped by resource. Each subfolder exposes an `APIRouter` that `app/main.py` mounts.

| Folder | Mount | Status |
|---|---|---|
| [bunq/](bunq/) | `/bunq/*` — users, balance, transactions, payments | **Built** (5 routes) |
| [telegram/](telegram/) | `/telegram/webhook` — Telegram Bot API updates | Pending |
| [lens/](lens/) | `/lens/scan` — upload image, return 3-tier product matches | Pending |
| [wishlist/](wishlist/) | `/wishlist/*` — CRUD for tracked items | Pending |
| [webhooks/](webhooks/) | `/webhooks/bunq` — `notification-filter-url` receiver | Pending |

## Rule

Route handlers validate Pydantic input, call a service, and return a Pydantic response. No business logic here — push it down into [../services/](../services/).
