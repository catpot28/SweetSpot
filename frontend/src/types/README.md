# types/

Shared TypeScript types that mirror the backend's API response shapes. Single source of truth on the frontend side — kept in sync manually with the FastAPI Pydantic models.

## Planned types

- `Product` — scan result item (id, title, price, merchant, thumbnailUrl, tier)
- `WishlistItem` — stored wish (productId, anchorPrice, currentPrice, status)
- `FinancialSnapshot` — balance + computed safe-to-spend buffer from the BUNQ agent
- `SweetSpotTrigger` — event payload pushed when an item hits the sweet spot
- `AffordabilityReasoning` — `{ verdict: "safe" | "risky" | "no", text: string }` from Claude
