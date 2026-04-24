"""
Repository for the `bunq_credentials` table.

The only place that knows the row layout. Returns / accepts `BunqState`
instances so callers don't deal with raw rows.

Lookup paths:
- by row id (UUID) — what `DbStateStore` uses once a row is selected.
- by `bunq_user_id` — useful while we have a single sandbox session and the
  Supabase auth user isn't linked yet.
- by `user_id` (Supabase auth uuid) — the production path once Telegram-bot
  onboarding links rows to real users.
"""
from __future__ import annotations

from uuid import UUID

import asyncpg

from app.services.bunq.state import BunqState


async def get_by_id(pool: asyncpg.Pool, row_id: UUID) -> BunqState | None:
    row = await pool.fetchrow(
        """
        SELECT bunq_user_id, monetary_account_id, api_key, private_key_pem,
               server_public_key, installation_token, device_id, session_token
        FROM bunq_credentials
        WHERE id = $1
        """,
        row_id,
    )
    return _row_to_state(row) if row else None


async def get_by_bunq_user_id(
    pool: asyncpg.Pool, bunq_user_id: int
) -> BunqState | None:
    row = await pool.fetchrow(
        """
        SELECT bunq_user_id, monetary_account_id, api_key, private_key_pem,
               server_public_key, installation_token, device_id, session_token
        FROM bunq_credentials
        WHERE bunq_user_id = $1
        """,
        bunq_user_id,
    )
    return _row_to_state(row) if row else None


async def get_by_user(pool: asyncpg.Pool, user_id: UUID) -> BunqState | None:
    row = await pool.fetchrow(
        """
        SELECT bunq_user_id, monetary_account_id, api_key, private_key_pem,
               server_public_key, installation_token, device_id, session_token
        FROM bunq_credentials
        WHERE user_id = $1
        """,
        user_id,
    )
    return _row_to_state(row) if row else None


async def upsert_by_bunq_user_id(pool: asyncpg.Pool, state: BunqState) -> UUID:
    """Full insert-or-update keyed on `bunq_user_id`. Returns the row's UUID."""
    return await pool.fetchval(
        """
        INSERT INTO bunq_credentials (
            bunq_user_id, monetary_account_id,
            api_key, private_key_pem, server_public_key,
            installation_token, device_id, session_token
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (bunq_user_id) DO UPDATE SET
            monetary_account_id = EXCLUDED.monetary_account_id,
            api_key             = EXCLUDED.api_key,
            private_key_pem     = EXCLUDED.private_key_pem,
            server_public_key   = EXCLUDED.server_public_key,
            installation_token  = EXCLUDED.installation_token,
            device_id           = EXCLUDED.device_id,
            session_token       = EXCLUDED.session_token,
            updated_at          = now()
        RETURNING id
        """,
        state.user_id,
        state.monetary_account_id,
        state.api_key,
        state.private_key_pem,
        state.server_public_key,
        state.installation_token,
        state.device_id,
        state.session_token,
    )


async def get_first_id(pool: asyncpg.Pool) -> UUID | None:
    """Returns the most-recently-created row's UUID, or None if empty.

    Single-user fallback for the current hackathon flow. Once the Telegram bot
    onboarding lands, callers should use `get_by_user(user_id)` instead.
    """
    return await pool.fetchval(
        "SELECT id FROM bunq_credentials ORDER BY created_at DESC LIMIT 1"
    )


async def update_session_token(
    pool: asyncpg.Pool, row_id: UUID, new_token: str
) -> None:
    await pool.execute(
        """
        UPDATE bunq_credentials
        SET session_token = $1, updated_at = now()
        WHERE id = $2
        """,
        new_token,
        row_id,
    )


def _row_to_state(row: asyncpg.Record) -> BunqState:
    return BunqState(
        api_key=row["api_key"],
        private_key_pem=row["private_key_pem"],
        server_public_key=row["server_public_key"],
        installation_token=row["installation_token"],
        device_id=row["device_id"],
        session_token=row["session_token"],
        user_id=row["bunq_user_id"],
        monetary_account_id=row["monetary_account_id"],
    )
