"""FastAPI dependency providers."""
from __future__ import annotations

from collections.abc import AsyncIterator
from pathlib import Path

from app.core.config import settings
from app.services.bunq.client import BunqClient
from app.services.bunq.state import FileStateStore

# State file lives next to the venv at backend/.bunq_state.json. Will be
# replaced by a SupabaseStateStore once the users table is online.
STATE_FILE = Path(__file__).resolve().parents[2] / ".bunq_state.json"


async def get_bunq_client() -> AsyncIterator[BunqClient]:
    if not STATE_FILE.exists():
        raise RuntimeError(f"no BUNQ state at {STATE_FILE} — run scripts/handshake.sh first")
    store = FileStateStore(STATE_FILE)
    state = store.load()
    async with BunqClient(state, store, base_url=settings.bunq_api_base) as client:
        yield client
