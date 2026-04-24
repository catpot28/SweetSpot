"""
High-level BUNQ operations on top of BunqClient.

Each function is a thin async wrapper around one BUNQ endpoint that returns a
plain dict / scalar. No FastAPI coupling — these are the same callables the
route handlers in app/api/bunq/ will use.
"""
from __future__ import annotations

from typing import Any

from .client import BunqClient


async def get_user(client: BunqClient) -> dict[str, Any]:
    data = await client.request("GET", f"/v1/user/{client.state.user_id}")
    for key in ("UserPerson", "UserCompany", "UserApiKey"):
        for item in data["Response"]:
            if key in item:
                return item[key]
    raise ValueError(f"no user object in response: {data}")


async def get_balance(client: BunqClient) -> dict[str, str]:
    data = await client.request(
        "GET",
        f"/v1/user/{client.state.user_id}"
        f"/monetary-account-bank/{client.state.monetary_account_id}",
    )
    return _pick(data["Response"], "MonetaryAccountBank")["balance"]


async def list_transactions(client: BunqClient, *, count: int = 50) -> list[dict[str, Any]]:
    data = await client.request(
        "GET",
        f"/v1/user/{client.state.user_id}"
        f"/monetary-account/{client.state.monetary_account_id}/payment?count={count}",
    )
    return [item["Payment"] for item in data["Response"] if "Payment" in item]


async def create_draft_payment(
    client: BunqClient,
    *,
    amount_eur: str,
    counterparty_email: str,
    description: str,
) -> int:
    data = await client.request(
        "POST",
        f"/v1/user/{client.state.user_id}"
        f"/monetary-account/{client.state.monetary_account_id}/draft-payment",
        {
            "number_of_required_accepts": 1,
            "entries": [
                {
                    "amount": {"value": amount_eur, "currency": "EUR"},
                    "counterparty_alias": {"type": "EMAIL", "value": counterparty_email},
                    "description": description,
                }
            ],
        },
    )
    return _pick(data["Response"], "Id")["id"]


async def confirm_draft_payment(client: BunqClient, draft_id: int) -> None:
    await client.request(
        "PUT",
        f"/v1/user/{client.state.user_id}"
        f"/monetary-account/{client.state.monetary_account_id}/draft-payment/{draft_id}",
        {"status": "ACCEPTED"},
    )


async def register_notification_webhook(client: BunqClient, *, url: str) -> None:
    await client.request(
        "POST",
        f"/v1/user/{client.state.user_id}/notification-filter-url",
        {
            "notification_filters": [
                {"category": "MUTATION", "notification_target": url},
            ]
        },
    )


def _pick(items: list[dict[str, Any]], key: str) -> dict[str, Any]:
    for item in items:
        if key in item:
            return item[key]
    raise ValueError(f"expected {key!r} in response, got: {items}")
