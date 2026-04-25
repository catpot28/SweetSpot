# lib/

Utilities shared across components, hooks, and pages. No UI here.

## Planned modules

- `api.ts` — typed fetch wrapper against the FastAPI backend. Base URL from `import.meta.env.VITE_API_BASE_URL`. Exposes `get`, `post`, `uploadImage`, etc.
- `storage.ts` — localStorage / IndexedDB helpers (e.g. cache the last scan result for fast return navigation)
- `format.ts` — money and date formatters (EUR, NL locale)
- `env.ts` — thin wrapper that reads Vite env vars with validation
