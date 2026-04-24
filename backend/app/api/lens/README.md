# api/lens/

Product capture endpoint.

## Endpoint

- `POST /lens/scan` — accepts an image (multipart upload **or** a URL) and returns 3-tier product matches plus an affordability verdict.

## Pipeline

1. Upload bytes to ImgBB (`services/imgbb`) → public URL.
2. Call SerpApi Google Lens (`services/serpapi`) with `country=nl`, `search_type=products`.
3. Group results into `budget` / `match` / `premium` tiers by price.
4. For each tier, ask `services/sweetspot` whether the user can afford it now.
5. Auto-save the `match` tier to the user's wishlist via `db/wishlist_repo` (price anchor).

Response shape mirrors `Product[]` in the frontend [../../../../frontend/src/types/](../../../../frontend/src/types/).
