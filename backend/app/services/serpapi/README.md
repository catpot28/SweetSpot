# services/serpapi/

Wrapper around SerpApi Google Lens.

## Input / output

- **Input:** a public image URL (provided by `services/imgbb`)
- **Query params:** `engine=google_lens`, `country=nl`, `search_type=products`
- **Output:** list of product matches — title, price, merchant, product URL, thumbnail, similarity score

## Tiering

Results get grouped into three tiers by price:
- `budget` — cheapest 33%
- `match` — middle group, re-ranked by visual similarity
- `premium` — most expensive 33%

The tiering function lives here, alongside the API call, because it is pure logic over SerpApi's output and has no other consumers.
