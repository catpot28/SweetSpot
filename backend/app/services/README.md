# services/

External API clients and domain logic. One folder per external dependency, plus `sweetspot/` for the core algorithm.

- [bunq/](bunq/) — BUNQ handshake, request signing, authenticated async client
- [serpapi/](serpapi/) — Google Lens product search
- [imgbb/](imgbb/) — image upload (bridge to SerpApi, which needs a URL)
- [anthropic/](anthropic/) — Claude calls for affordability reasoning
- [sweetspot/](sweetspot/) — price × affordability scoring

## Rules

- Services are stateless — credentials come from `core/config`.
- No FastAPI imports here. Services must be usable from scripts and tests without an HTTP layer.
- I/O is async (`httpx.AsyncClient`) so handlers stay non-blocking.
