"""FastAPI dependency providers."""
from __future__ import annotations

from collections.abc import AsyncIterator

from app.core.config import settings
from app.db import bunq_credentials_repo
from app.db.client import get_pool
from app.services.bunq.client import BunqClient
from app.services.bunq.state import DbStateStore


async def get_bunq_client() -> AsyncIterator[BunqClient]:
    """Yields a BunqClient backed by the bunq_credentials row in Supabase.

    Single-user fallback for now: picks the most-recently-created row. Once
    Telegram onboarding lands and rows get linked to auth users, we'll resolve
    the row from `auth.users.id` instead.
    """
    pool = get_pool()
    row_id = await bunq_credentials_repo.get_first_id(pool)
    if row_id is None:
        raise RuntimeError(
            "no bunq_credentials row in DB — run scripts/migrate-state-to-db.sh first"
        )
    store = DbStateStore(pool, row_id)
    state = await store.load()
    async with BunqClient(state, store, base_url=settings.bunq_api_base) as client:
        yield client
