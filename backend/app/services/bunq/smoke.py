"""
End-to-end smoke test for BunqClient + operations against the live sandbox.

Loads state from backend/.bunq_state.json (handshake.py must have run once),
exercises every operation we care about, and prints results. Skips the webhook
registration since we don't have a public URL yet.

Run from backend/:
    .venv/bin/python -m app.services.bunq.smoke
"""
from __future__ import annotations

import asyncio
from pathlib import Path

from .client import BunqClient
from .state import FileStateStore
from . import operations as ops

STATE_FILE = Path(__file__).resolve().parents[3] / ".bunq_state.json"


async def main() -> None:
    if not STATE_FILE.exists():
        raise SystemExit(f"no state at {STATE_FILE} — run scripts/handshake.sh first")

    store = FileStateStore(STATE_FILE)
    state = store.load()

    async with BunqClient(state, store) as client:
        print("=== get_user ===")
        user = await ops.get_user(client)
        print(f"  id:      {user['id']}")
        print(f"  name:    {user.get('display_name') or user.get('public_nick_name')}")

        print("\n=== get_balance ===")
        balance = await ops.get_balance(client)
        print(f"  {balance['value']} {balance['currency']}")

        print("\n=== list_transactions (before) ===")
        txs_before = await ops.list_transactions(client, count=10)
        for tx in txs_before:
            amt = tx["amount"]
            print(f"  [{tx['id']}] {amt['value']} {amt['currency']}  {tx.get('description', '')!r}")
        print(f"  ({len(txs_before)} transactions)")

        print("\n=== create_draft_payment (1.00 EUR -> sugardaddy) ===")
        draft_id = await ops.create_draft_payment(
            client,
            amount_eur="1.00",
            counterparty_email="sugardaddy@bunq.com",
            description="SweetSpot smoke test",
        )
        print(f"  draft id: {draft_id}")

        print("\n=== confirm_draft_payment ===")
        await ops.confirm_draft_payment(client, draft_id)
        print(f"  confirmed draft {draft_id}")

        # Give BUNQ a moment to materialize the payment.
        await asyncio.sleep(2)

        print("\n=== list_transactions (after) ===")
        txs_after = await ops.list_transactions(client, count=10)
        for tx in txs_after:
            amt = tx["amount"]
            print(f"  [{tx['id']}] {amt['value']} {amt['currency']}  {tx.get('description', '')!r}")
        new_count = len(txs_after) - len(txs_before)
        print(f"  ({len(txs_after)} transactions, +{new_count} since draft)")

        print("\n=== get_balance (after) ===")
        balance_after = await ops.get_balance(client)
        print(f"  {balance_after['value']} {balance_after['currency']}")

    print("\nsmoke OK")


if __name__ == "__main__":
    asyncio.run(main())
