# components/

Reusable UI building blocks. No route logic, no business logic — just presentation and light interaction.

## Planned components

- `CameraCapture` — wraps `getUserMedia`, produces a photo blob ready to upload
- `ProductCard` — one scanned product tier (budget / match / premium): image, title, price, merchant
- `WishlistItem` — row in the wishlist list with a live status dot
- `AffordabilityBadge` — green / yellow / red indicator based on BUNQ buffer
- `PriceDropBadge` — orange badge when price dropped below anchor
- `SweetSpotBadge` — gold badge when affordable **and** price dropped
- `ReasoningCard` — renders the Claude-generated purchase-timing rationale

## Style

Tailwind utility classes. Keep components stateless where possible — lift state into hooks or pages.
