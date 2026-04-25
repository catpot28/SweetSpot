# api/lens/

Persisted search candidate retrieval.

## Endpoint

- `GET /lens/searches/{search_id}/candidates` - returns the top persisted candidates for a stored product search.

## Pipeline

1. A prior search persists `product_candidates` linked to `product_searches`.
2. This endpoint reads candidates back ordered by `result_position`.
3. v1 returns the first 3 candidates; ranking rules can evolve later.
