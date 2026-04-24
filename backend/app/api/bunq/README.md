# api/bunq/

HTTP routes that wrap BUNQ's REST API, per [../../../../BUNQ_INTEGRATION.md](../../../../BUNQ_INTEGRATION.md).

## Endpoints

| Route | BUNQ endpoint |
|---|---|
| `POST /bunq/users` | mint sandbox user + run 4-step handshake, store creds in Supabase |
| `GET /bunq/balance/{user_id}` | proxy to `GET /v1/user/{uid}/monetary-account-bank` |
| `GET /bunq/transactions/{user_id}` | proxy to `GET /v1/user/{uid}/monetary-account/{aid}/payment` |
| `POST /bunq/payments` | proxy to `POST /v1/user/{uid}/monetary-account/{aid}/payment` |

## Implementation notes

- Delegates all HTTP work to `services/bunq/BunqClient`.
- Looks up per-user credentials via `db/users_repo`.
- `POST /bunq/users` also registers the notification webhook so BUNQ starts pushing events to `/webhooks/bunq`.
