# BUNQ Integration — Hackathon Guide

## Core Concept

bunq is a **REST API**. You call it from your FastAPI backend over HTTPS. Nothing to host on bunq's side.

**SDK is NOT required.** It's just a Python wrapper around HTTP calls. The deprecated SDK in this repo = skip it. Call the API directly with `httpx`.

```
Your FastAPI ──HTTPS──► https://public-api.sandbox.bunq.com
```

Same endpoints whether you use the SDK or not. The API itself is actively maintained — only the wrapper library is abandoned.

---

## Handshake (one-time per user)

Sandbox requires 4 sequential calls before any real API call:

```
POST /v1/sandbox-user-person   → api_key
POST /v1/installation          → installation_token + server pubkey
POST /v1/device-server         → device_id (IP-bound)
POST /v1/session-server        → session_token (~24h, auto-refresh on 401)
```

Every subsequent request is signed with your private key and sends:
```
X-Bunq-Client-Authentication: <session_token>
```

---

## State Storage — Supabase

One row per Telegram user. Store **everything** in Supabase (Railway disk is ephemeral):

```sql
users (
  telegram_user_id   PK,
  api_key,
  private_key_pem,
  installation_token,
  device_id,
  session_token,
  session_expires_at
)
```

Each user gets their **own sandbox user** (own balance, own transactions).

---

## The 4 FastAPI Routes

| Route | bunq endpoint |
|---|---|
| `POST /bunq/users` | mint sandbox user + handshake |
| `GET /bunq/balance/{user_id}` | `GET /v1/user/{uid}/monetary-account-bank` |
| `GET /bunq/transactions/{user_id}` | `GET /v1/user/{uid}/monetary-account/{aid}/payment` |
| `POST /bunq/payments` | `POST /v1/user/{uid}/monetary-account/{aid}/payment` |

**Sandbox top-up:** `POST /request-inquiry` to `sugardaddy@bunq.com` → €500, instant, free.

---

## Webhooks (skip polling)

```
PUT /v1/user/{uid}/notification-filter-url
```

bunq POSTs every transaction to your FastAPI webhook URL. Real-time Sweet Spot triggers, no cron needed.

---

## Build Order

De-risk the handshake first. Do NOT skip ahead.

1. **Handshake script** — one hardcoded user, prints balance. Stop here until it works.
2. **`BunqClient` class** — `async request(method, path, body)` with auto 401 → session refresh.
3. **Supabase schema** — persist credentials per user.
4. **4 FastAPI routes** — wire them up.
5. **Webhook endpoint** — register URL, receive events.
6. **Then** plug in Telegram / SerpApi / Claude / sweet-spot logic.

---

## Railway Notes

- Persist state in Supabase, **not** local files.
- Device registration is IP-bound — register from Railway deploy, not your laptop, or you'll get 403s.
- Env vars: `BUNQ_API_BASE=https://public-api.sandbox.bunq.com`, Supabase URL/key, Anthropic key.

---

## Production Note (post-hackathon)

Sandbox mints users freely. Production requires OAuth consent flow — user redirected to bunq, logs in, approves app. Don't architect around OAuth for the hackathon.
