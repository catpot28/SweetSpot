"""
BUNQ sandbox top-up via the sugardaddy trick (BUNQ_INTEGRATION.md line 65).

Loads state from backend/.bunq_state.json (written by handshake.py), POSTs a
request-inquiry to sugardaddy@bunq.com for the requested amount, and re-reads
the monetary-account balance to confirm the money arrived. Sandbox sugardaddy
auto-accepts instantly, so the balance should update within a second.

Run:
    backend/.venv/bin/python backend/app/services/bunq/topup.py [amount_eur]
or via:
    scripts/topup.sh [amount_eur]

Default amount: 50.00 EUR.
"""
from __future__ import annotations

import base64
import json
import sys
import time
import uuid
from pathlib import Path
from typing import Any

import httpx
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa

API_BASE = "https://public-api.sandbox.bunq.com"
USER_AGENT = "SweetSpot/0.1 (topup)"
STATE_FILE = Path(__file__).resolve().parents[3] / ".bunq_state.json"


def sign_body(private_key: rsa.RSAPrivateKey, body: bytes) -> str:
    sig = private_key.sign(body, padding.PKCS1v15(), hashes.SHA256())
    return base64.b64encode(sig).decode()


def base_headers() -> dict[str, str]:
    return {
        "Cache-Control": "no-cache",
        "User-Agent": USER_AGENT,
        "X-Bunq-Client-Request-Id": str(uuid.uuid4()),
        "X-Bunq-Geolocation": "0 0 0 0 NL",
        "X-Bunq-Language": "en_US",
        "X-Bunq-Region": "nl_NL",
    }


def post(
    client: httpx.Client,
    path: str,
    body: dict[str, Any],
    *,
    auth: str,
    private_key: rsa.RSAPrivateKey,
) -> dict[str, Any]:
    raw = json.dumps(body).encode()
    headers = base_headers()
    headers["Content-Type"] = "application/json"
    headers["X-Bunq-Client-Authentication"] = auth
    headers["X-Bunq-Client-Signature"] = sign_body(private_key, raw)
    r = client.post(path, content=raw, headers=headers)
    if r.status_code >= 400:
        sys.exit(f"[POST {path}] HTTP {r.status_code}: {r.text}")
    return r.json()


def get(client: httpx.Client, path: str, *, auth: str) -> dict[str, Any]:
    headers = base_headers()
    headers["X-Bunq-Client-Authentication"] = auth
    r = client.get(path, headers=headers)
    if r.status_code >= 400:
        sys.exit(f"[GET {path}] HTTP {r.status_code}: {r.text}")
    return r.json()


def pick(items: list[dict[str, Any]], key: str) -> dict[str, Any]:
    for item in items:
        if key in item:
            return item[key]
    sys.exit(f"expected {key!r} in response, got: {items}")


def read_balance(client: httpx.Client, user_id: int, account_id: int, session: str) -> tuple[str, str]:
    data = get(client, f"/v1/user/{user_id}/monetary-account-bank/{account_id}", auth=session)
    account = pick(data["Response"], "MonetaryAccountBank")
    return account["balance"]["value"], account["balance"]["currency"]


def main() -> None:
    if not STATE_FILE.exists():
        sys.exit(f"no state at {STATE_FILE} — run scripts/handshake.sh first")

    amount_eur = sys.argv[1] if len(sys.argv) > 1 else "50.00"

    state = json.loads(STATE_FILE.read_text())
    private_key = serialization.load_pem_private_key(
        state["private_key_pem"].encode(), password=None
    )
    session = state["session_token"]
    user_id = state["user_id"]
    account_id = state["monetary_account_id"]

    with httpx.Client(base_url=API_BASE, timeout=30) as client:
        before_value, currency = read_balance(client, user_id, account_id, session)
        print(f"balance before: {before_value} {currency}")

        print(f"POST /v1/user/{user_id}/monetary-account/{account_id}/request-inquiry  ({amount_eur} EUR)")
        resp = post(
            client,
            f"/v1/user/{user_id}/monetary-account/{account_id}/request-inquiry",
            {
                "amount_inquired": {"value": amount_eur, "currency": "EUR"},
                "counterparty_alias": {"type": "EMAIL", "value": "sugardaddy@bunq.com"},
                "description": "SweetSpot sandbox top-up",
                "allow_bunqme": True,
            },
            auth=session,
            private_key=private_key,
        )
        request_id = pick(resp["Response"], "Id")["id"]
        print(f"request-inquiry id: {request_id}")

        # sugardaddy auto-accepts, but allow a moment for propagation
        after_value = before_value
        for attempt in range(5):
            time.sleep(1)
            after_value, _ = read_balance(client, user_id, account_id, session)
            if after_value != before_value:
                break
            print(f"  waiting for sugardaddy... ({attempt + 1}/5)")

    print()
    if after_value == before_value:
        print(f"balance unchanged at {after_value} {currency} — sugardaddy may be slow, try again")
        sys.exit(1)
    print(f"balance after:  {after_value} {currency}  (+{float(after_value) - float(before_value):.2f})")


if __name__ == "__main__":
    main()
