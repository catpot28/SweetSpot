# api/bunq/

Routes that wrap BUNQ's REST API, per [../../../../BUNQ_INTEGRATION.md](../../../../BUNQ_INTEGRATION.md). Each handler delegates to [../../services/bunq/operations.py](../../services/bunq/operations.py).

## FastAPI surface

| Method | Route | Status | BUNQ endpoint | Notes |
|---|---|---|---|---|
| GET  | `/bunq/users/{user_id}` | **Built** | `GET /v1/user/{uid}` | Display name / avatar |
| GET  | `/bunq/balance/{user_id}` | **Built** | `GET /v1/user/{uid}/monetary-account-bank/{aid}` | Current balance |
| GET  | `/bunq/transactions/{user_id}` | **Built** | `GET /v1/user/{uid}/monetary-account/{aid}/payment` | Spending history for sweet-spot buffer calc |
| POST | `/bunq/payments/draft` | **Built** | `POST /v1/user/{uid}/monetary-account/{aid}/draft-payment` | Pending payment for "Buy it" preview |
| POST | `/bunq/payments/{draft_id}/confirm` | **Built** | `PUT .../draft-payment/{id}` (status=ACCEPTED) | Executes the draft |
| POST | `/bunq/users/{user_id}/webhook` | **Built** | `POST /v1/user/{uid}/notification-filter-url` | Tells BUNQ to push events to our `/webhooks/bunq`. Body `{"url": "..."}` is optional — auto-falls-back to `https://${RAILWAY_PUBLIC_DOMAIN}/webhooks/bunq` |
| POST | `/bunq/users` | Pending | full handshake + register webhook | Needs Supabase to store one row per user |

The BUNQ → us notification receiver lives under [../webhooks/](../webhooks/) (see [../webhooks/README.md](../webhooks/README.md)).

## Implementation notes

- Delegates HTTP work to `services/bunq/BunqClient` via the `get_bunq_client` dependency in [../../core/deps.py](../../core/deps.py).
- For now there's exactly one user (loaded from `backend/.bunq_state.json`); the route validates that the path `user_id` matches the loaded state and returns 404 otherwise. Once Supabase is wired up, lookup moves to `db/users_repo`.
- Upstream BUNQ failures are surfaced as **502** (not 500) via the `BunqApiError` exception handler, with the original method/path/status/body in the response.
- Draft-payment is preferred over raw `POST /payment` for user-initiated purchases — explicit "preview → confirm" matches the product UX and gives the agent a chance to insert reasoning between the two steps.
