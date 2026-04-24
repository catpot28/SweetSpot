# infra/

Deployment and external-service config. Nothing in here runs code — only describes how the app is hosted and what external projects it depends on.

## Subfolders

- [railway/](railway/) — Railway deploy config and the required env var matrix
- [supabase/](supabase/) — Supabase project setup notes (actual SQL migrations live in [../backend/app/db/migrations/](../backend/app/db/migrations/))
