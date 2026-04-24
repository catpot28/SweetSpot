# api/webhooks/

Inbound webhooks from third parties.

## Endpoint

- `POST /webhooks/bunq` — BUNQ pushes every transaction here once the user has registered a `notification-filter-url` (see [../../../../BUNQ_INTEGRATION.md](../../../../BUNQ_INTEGRATION.md)).

## Flow

1. Validate the signature using the server public key stored at installation time (in `db/users_repo`).
2. Decode the event payload.
3. Enqueue (or run inline) a sweet-spot re-evaluation for the affected user's wishlist — the user's balance/buffer just changed, so `affordable_now` flags may flip.
4. If any item transitions into `sweet_spot`, fire a Telegram notification.

No polling — webhook only.
