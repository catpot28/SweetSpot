# api/

HTTP routes grouped by resource. Each subfolder exposes an `APIRouter` that `app/main.py` mounts.

| Folder | Mount | Status |
|---|---|---|
| [bunq/](bunq/) | `/bunq/*` - users, balance, transactions, payments | **Built** (5 routes) |
| [telegram/](telegram/) | `/telegram/webhook` - Telegram Bot API updates | **Built** |
| [lens/](lens/) | `/lens/*` - persisted search candidate retrieval | **Built** |
| [wishlist/](wishlist/) | `/wishlist/*` - selected candidate persistence | **Built** |
| [webhooks/](webhooks/) | `/webhooks/bunq` - `notification-filter-url` receiver | Pending |

## Rule

Route handlers validate Pydantic input, call a service, and return a Pydantic response. No business logic here - push it down into [../services/](../services/).
