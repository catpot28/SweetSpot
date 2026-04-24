"""
Per-user BUNQ credentials and where to store them.

`BunqState` is the dataclass we read/write — same fields as the row in the
`users` Supabase table per BUNQ_INTEGRATION.md, plus `monetary_account_id`
to address the user's account directly.

Right now state lives in a JSON file (`backend/.bunq_state.json`). When
Supabase comes online, swap `FileStateStore` for a `SupabaseStateStore` that
implements the same `StateStore` protocol — nothing else changes.
"""
from __future__ import annotations

import json
from dataclasses import asdict, dataclass, replace
from pathlib import Path
from typing import Protocol

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa


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
    def load(self) -> BunqState: ...
    def save(self, state: BunqState) -> None: ...


class FileStateStore:
    def __init__(self, path: Path) -> None:
        self.path = path

    def load(self) -> BunqState:
        return BunqState(**json.loads(self.path.read_text()))

    def save(self, state: BunqState) -> None:
        self.path.write_text(json.dumps(asdict(state), indent=2))
