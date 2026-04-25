# api/wishlist/

Wishlist selection endpoint.

## Endpoint

| Route | Purpose |
|---|---|
| `POST /wishlist` | add a selected `product_candidate` to the wishlist |

Current v1 body:
- `product_candidate_id`
- optional `note`

## Dependencies

- `db/product_searches_repo` - candidate lookup + `wishlist_items` insert
- `services/wishlist` - selection-time wishlist persistence
