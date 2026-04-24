# tests/

Pytest suite for the backend.

## Layout

- `unit/` — service logic with external HTTP mocked via `respx`; fast, no network.
- `integration/` — exercises the real BUNQ sandbox and a test Supabase project. Gated behind an env flag (`RUN_INTEGRATION=1`) so CI can skip by default.
- `conftest.py` — shared fixtures:
  - FastAPI `TestClient`
  - temporary Supabase tables (or a dedicated test schema)
  - canned BUNQ responses for handshake + balance

## Running

From the `backend/` directory:
```
pytest               # unit only
RUN_INTEGRATION=1 pytest  # everything
```
