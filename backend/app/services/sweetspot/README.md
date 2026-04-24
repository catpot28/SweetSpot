# services/sweetspot/

Core sweet-spot algorithm.

## Formula

```
score = price_score × affordability_score
```

- **price_score** — how far the current price has moved below its anchor (the price when first scanned), drawn from daily price polls in `price_history`.
- **affordability_score** — how comfortably the item's price fits within the user's safe-to-spend buffer, derived from the last 60 days of BUNQ transactions.

A sweet-spot trigger fires when `score` crosses a threshold.

## Invocation points

- **Scheduled** — daily, after the price poll refreshes `price_history`.
- **Event-driven** — on every inbound BUNQ webhook (`/webhooks/bunq`) because balance / buffer just changed.
- **On read** — when the frontend calls `GET /wishlist/{user_id}`, to return up-to-date badges.

## Output

Per-item status: `affordable_now`, `price_dropped`, `sweet_spot` (both conditions met).
