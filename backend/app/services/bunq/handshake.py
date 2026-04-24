"""
BUNQ sandbox handshake — build-step 1 per BUNQ_INTEGRATION.md.

Mints a fresh sandbox user, runs the 4-call handshake, and prints the user's
balance. On success writes state to backend/.bunq_state.json (gitignored) so
later tests can reuse the session without re-handshaking.

Run:
    backend/.venv/bin/python backend/app/services/bunq/handshake.py
or via:
    scripts/handshake.sh

IP note: POST /v1/device-server is IP-bound. Creds minted from your laptop
will NOT work from Railway — re-run from the deploy once we ship.
"""
from __future__ import annotations

import base64
import json
import sys
import uuid
from pathlib import Path
from typing import Any

import httpx
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa

API_BASE = "https://public-api.sandbox.bunq.com"
USER_AGENT = "SweetSpot/0.1 (handshake)"
DEVICE_DESCRIPTION = "SweetSpot handshake (de-risk)"
STATE_FILE = Path(__file__).resolve().parents[3] / ".bunq_state.json"


def new_keypair() -> tuple[rsa.RSAPrivateKey, str, str]:
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public_pem = key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode()
    private_pem = key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.TraditionalOpenSSL,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode()
    return key, public_pem, private_pem


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
    auth: str | None = None,
    private_key: rsa.RSAPrivateKey | None = None,
) -> dict[str, Any]:
    raw = json.dumps(body).encode()
    headers = base_headers()
    headers["Content-Type"] = "application/json"
    if auth:
        headers["X-Bunq-Client-Authentication"] = auth
    if private_key is not None:
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


def main() -> None:
    with httpx.Client(base_url=API_BASE, timeout=30) as client:
        print("1/5  POST /v1/sandbox-user-person")
        sandbox = post(client, "/v1/sandbox-user-person", {})
        api_key = pick(sandbox["Response"], "ApiKey")["api_key"]

        print("2/5  POST /v1/installation")
        private_key, public_pem, private_pem = new_keypair()
        inst = post(client, "/v1/installation", {"client_public_key": public_pem})
        installation_token = pick(inst["Response"], "Token")["token"]
        server_pubkey = pick(inst["Response"], "ServerPublicKey")["server_public_key"]

        print("3/5  POST /v1/device-server")
        dev = post(
            client,
            "/v1/device-server",
            {
                "description": DEVICE_DESCRIPTION,
                "secret": api_key,
                "permitted_ips": ["*"],
            },
            auth=installation_token,
            private_key=private_key,
        )
        device_id = pick(dev["Response"], "Id")["id"]

        print("4/5  POST /v1/session-server")
        sess = post(
            client,
            "/v1/session-server",
            {"secret": api_key},
            auth=installation_token,
            private_key=private_key,
        )
        session_token = pick(sess["Response"], "Token")["token"]
        user_person = pick(sess["Response"], "UserPerson")
        user_id = user_person["id"]

        print(f"5/5  GET  /v1/user/{user_id}/monetary-account-bank")
        accounts = get(
            client,
            f"/v1/user/{user_id}/monetary-account-bank",
            auth=session_token,
        )
        account = pick(accounts["Response"], "MonetaryAccountBank")

    balance = account["balance"]
    alias = account["alias"][0]["value"] if account.get("alias") else "?"

    STATE_FILE.write_text(
        json.dumps(
            {
                "api_key": api_key,
                "private_key_pem": private_pem,
                "server_public_key": server_pubkey,
                "installation_token": installation_token,
                "device_id": device_id,
                "session_token": session_token,
                "user_id": user_id,
                "monetary_account_id": account["id"],
            },
            indent=2,
        )
    )

    print()
    print("handshake OK")
    print(f"  user id:     {user_id}")
    print(f"  account id:  {account['id']}")
    print(f"  alias:       {alias}")
    print(f"  balance:     {balance['value']} {balance['currency']}")
    print(f"  state saved: {STATE_FILE}")


if __name__ == "__main__":
    main()
