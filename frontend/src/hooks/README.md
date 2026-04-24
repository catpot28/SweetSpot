# hooks/

Custom React hooks — encapsulate data fetching and side effects so components stay declarative.

## Planned hooks

- `useCamera` — request camera permission, capture a frame, return a blob
- `useWishlist` — read + mutate the wishlist against backend `/wishlist`
- `useAffordability(itemId)` — fetch Claude-generated reasoning for a specific item
- `useSweetSpots` — subscribe to server-sent updates for trigger events (or poll, depending on infra)
- `useBalance` — current BUNQ balance snapshot

## Convention

Hooks own the loading/error state. Components never call `fetch` directly.
