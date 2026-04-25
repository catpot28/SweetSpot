"""
One-off: copy backend/.bunq_state.json into the bunq_credentials Supabase table.

Idempotent — uses ON CONFLICT (bunq_user_id) DO UPDATE, so re-running with the
same JSON file just updates session_token + updated_at.

Run from backend/:
    .venv/bin/python -m app.db.migrate_state
"""
from __future__ import annotations

import asyncio
import json
from pathlib import Path

from app.db import bunq_credentials_repo
from app.db.client import close_pool, init_pool
from app.services.bunq.state import BunqState

STATE_FILE = Path(__file__).resolve().parents[2] / ".bunq_state.json"


async def main() -> None:
    if not STATE_FILE.exists():
        raise SystemExit(f"no state at {STATE_FILE} — run scripts/handshake.sh first")

    state = BunqState(**json.loads(STATE_FILE.read_text()))
    pool = await init_pool()
    try:
        row_id = await bunq_credentials_repo.upsert_by_bunq_user_id(pool, state)
        print(f"migrated bunq_user_id={state.user_id} -> bunq_credentials.id={row_id}")
    finally:
        await close_pool()


if __name__ == "__main__":
    asyncio.run(main())
