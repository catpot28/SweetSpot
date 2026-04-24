# api/wishlist/

Wishlist CRUD and purchase action.

## Endpoints

| Route | Purpose |
|---|---|
| `GET /wishlist/{user_id}` | list items with live affordability + price-drop status |
| `POST /wishlist` | add an item (usually called internally after a scan) |
| `DELETE /wishlist/{item_id}` | remove an item |
| `POST /wishlist/{item_id}/purchase` | ask Claude for reasoning → if confirmed, call `POST /bunq/payments` |

## Dependencies

- `db/wishlist_repo` — persistence
- `services/sweetspot` — live status (`affordable_now`, `price_dropped`, `sweet_spot`)
- `services/anthropic` — human-readable reasoning for the purchase step
- `services/bunq` — executes the payment
