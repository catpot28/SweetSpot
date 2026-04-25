"""
Per-user BUNQ credentials and where to store them.

`BunqState` is the in-memory shape we pass around — same fields as a row in
the `bunq_credentials` Supabase table per BUNQ_INTEGRATION.md, plus
`monetary_account_id` to address the user's account directly.

Two store implementations, both async:
- `FileStateStore` — single-user JSON file, used by handshake.py / topup.py
  reference scripts and as a fallback when the DB isn't available.
- `DbStateStore` — Supabase-backed, used by the FastAPI server in production.

Both implement the `StateStore` async protocol so the BunqClient doesn't care
which one it has.
"""
from __future__ import annotations

import asyncio
import json
from dataclasses import asdict, dataclass, replace
from pathlib import Path
from typing import TYPE_CHECKING, Protocol

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

if TYPE_CHECKING:
    from uuid import UUID

    import asyncpg


@dataclass(frozen=True)
class BunqState:
    api_key: str
    private_key_pem: str
    server_public_key: str
    installation_token: str
    device_id: int
    session_token: str
    user_id: int
    monetary_account_id: int

    def with_session(self, new_token: str) -> "BunqState":
        return replace(self, session_token=new_token)

    @property
    def private_key(self) -> rsa.RSAPrivateKey:
        return serialization.load_pem_private_key(
            self.private_key_pem.encode(), password=None
        )


class StateStore(Protocol):
    async def load(self) -> BunqState: ...
    async def save(self, state: BunqState) -> None: ...


class FileStateStore:
    def __init__(self, path: Path) -> None:
        self.path = path

    async def load(self) -> BunqState:
        # File reads are fast and the file is small; sync I/O on a thread is fine.
        return await asyncio.to_thread(self._load_sync)

    async def save(self, state: BunqState) -> None:
        await asyncio.to_thread(self._save_sync, state)

    def _load_sync(self) -> BunqState:
        return BunqState(**json.loads(self.path.read_text()))

    def _save_sync(self, state: BunqState) -> None:
        self.path.write_text(json.dumps(asdict(state), indent=2))


class DbStateStore:
    """Async StateStore backed by the bunq_credentials table.

    Bound to a specific row at construction so callers can't accidentally
    read or write the wrong user's credentials. Use the repo's lookup
    helpers (`get_by_user`, `get_by_bunq_user_id`, `get_by_id`) to find
    the right `row_id` first.
    """

    def __init__(self, pool: "asyncpg.Pool", row_id: "UUID") -> None:
        self._pool = pool
        self._row_id = row_id

    async def load(self) -> BunqState:
        # Local import keeps services/ free of an `app.db` runtime dependency.
        from app.db import bunq_credentials_repo

        state = await bunq_credentials_repo.get_by_id(self._pool, self._row_id)
        if state is None:
            raise LookupError(
                f"no bunq_credentials row with id={self._row_id}"
            )
        return state

    async def save(self, state: BunqState) -> None:
        # BunqClient only mutates session_token (in _refresh_session), so we
        # only persist that field. For full upserts use
        # bunq_credentials_repo.upsert_by_bunq_user_id directly.
        from app.db import bunq_credentials_repo

        await bunq_credentials_repo.update_session_token(
            self._pool, self._row_id, state.session_token
        )
