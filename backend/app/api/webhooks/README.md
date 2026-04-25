# api/webhooks/

Inbound webhooks from third parties.

## Endpoint

| Method | Route | Purpose |
|---|---|---|
| POST | `/webhooks/bunq` | Receive BUNQ `notification-filter-url` callbacks |

## Flow

1. BUNQ POSTs every account mutation here in near-real-time once a user has registered the URL (see [../bunq/](../bunq/) — `POST /bunq/users/{user_id}/webhook`).
2. Today: log the payload, ack 200. **No re-evaluation logic yet** — that lands once `services/sweetspot/` exists.
3. Future: validate the body signature against the server pubkey we stored at installation; re-score the user's wishlist; if anything crosses threshold, push a Telegram notification.

## Pending

- Signature verification (right now any POST is accepted — fine for sandbox, not for production).
- Sweet-spot re-evaluation hook.
- Telegram notification fan-out.
