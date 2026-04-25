"""
Seed script: top up sandbox account and simulate 60 days of spending
by calling the live Railway API endpoints directly.

Run from anywhere:
    python scripts/seed_transactions.py

Edit BASE_URL and USER_ID below before running.
"""
from __future__ import annotations

import sys
import httpx

BASE_URL = "https://sweetspot-telegram-scan-pipeline.up.railway.app"
USER_ID  = 3628657
TOPUP_AMOUNT = "3500.00"
SUGARDADDY = "sugardaddy@bunq.com"

# ---------------------------------------------------------------------------
# Fixed: €1,000/month × 2 months = €2,000 total
# ---------------------------------------------------------------------------
FIXED_TRANSACTIONS = [
    ("Rent #fixed",      "700.00"),
    ("Insurance #fixed", "100.00"),
    ("Phone #fixed",      "35.00"),
    ("Internet #fixed",   "45.00"),
    ("Netflix #fixed",    "18.00"),
    ("Spotify #fixed",    "12.00"),
    ("Gym #fixed",        "90.00"),
]

# ---------------------------------------------------------------------------
# Variable: €700 total across 8 weeks
# ---------------------------------------------------------------------------
VARIABLE_TRANSACTIONS = [
    ("Albert Heijn groceries #variable",  "35.00"),
    ("Albert Heijn groceries #variable",  "38.00"),
    ("Albert Heijn groceries #variable",  "32.00"),
    ("Albert Heijn groceries #variable",  "40.00"),
    ("Albert Heijn groceries #variable",  "35.00"),
    ("Albert Heijn groceries #variable",  "37.00"),
    ("Albert Heijn groceries #variable",  "36.00"),
    ("Albert Heijn groceries #variable",  "37.00"),
    ("NS transport #variable",            "25.00"),
    ("NS transport #variable",            "28.00"),
    ("NS transport #variable",            "24.00"),
    ("NS transport #variable",            "23.00"),
    ("Thuisbezorgd dining #variable",     "32.00"),
    ("Restaurant dining #variable",       "45.00"),
    ("Restaurant dining #variable",       "43.00"),
    ("Bar entertainment #variable",       "50.00"),
    ("Zara clothing #variable",           "80.00"),
    ("Bol.com misc #variable",            "25.00"),
    ("Action misc #variable",             "20.00"),
    ("Pharmacy misc #variable",           "15.00"),
]


def topup(client: httpx.Client, amount: str) -> None:
    res = client.post("/bunq/topup", json={"amount_eur": amount})
    if res.status_code >= 400:
        sys.exit(f"Top-up failed: {res.status_code} {res.text}")
    print(f"  ✓  +{amount}  top-up")


def pay(client: httpx.Client, description: str, amount: str) -> None:
    res = client.post(
        "/bunq/payments/draft",
        json={
            "amount_eur": amount,
            "counterparty_email": SUGARDADDY,
            "description": description,
            "category": "other",
        },
    )
    if res.status_code >= 400:
        sys.exit(f"Draft failed: {res.status_code} {res.text}")
    draft_id = res.json()["draft_id"]

    res = client.post(f"/bunq/payments/{draft_id}/confirm")
    if res.status_code >= 400:
        sys.exit(f"Confirm failed: {res.status_code} {res.text}")
    print(f"  ✓  -{amount:>8}  {description}")


def main() -> None:
    with httpx.Client(base_url=BASE_URL, timeout=30) as client:
        # 1 — Top up
        print(f"Topping up {TOPUP_AMOUNT} EUR...")
        topup(client, TOPUP_AMOUNT)

        balance = client.get(f"/bunq/balance/{USER_ID}").json()
        print(f"Balance after top-up: {balance['value']} {balance['currency']}\n")

        # 2 — Fixed costs x2 months
        print("Creating fixed costs (2 months)...")
        for _ in range(2):
            for desc, amt in FIXED_TRANSACTIONS:
                pay(client, desc, amt)

        # 3 — Variable costs
        print("\nCreating variable costs (8 weeks)...")
        for desc, amt in VARIABLE_TRANSACTIONS:
            pay(client, desc, amt)

        # 4 — Final balance
        balance_after = client.get(f"/bunq/balance/{USER_ID}").json()
        print(f"\nFinal balance: {balance_after['value']} {balance_after['currency']}")
        print("Seed complete ✓")


if __name__ == "__main__":
    main()
