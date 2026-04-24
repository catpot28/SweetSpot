"""
asyncpg connection pool, managed by the FastAPI lifespan.

Supabase exposes its Postgres through two poolers; we use the **transaction
pooler** on port 6543 (good for short-lived web requests). Transaction-mode
pooling is incompatible with prepared-statement caching, so we set
`statement_cache_size=0`. SSL is required.
"""
from __future__ import annotations

import asyncpg

from app.core.config import settings

_pool: asyncpg.Pool | None = None


async def init_pool() -> asyncpg.Pool:
    global _pool
    if settings.database_url is None:
        raise RuntimeError("DATABASE_URL is not set — check .env")
    if _pool is not None:
        return _pool
    _pool = await asyncpg.create_pool(
        settings.database_url.get_secret_value(),
        min_size=1,
        max_size=10,
        ssl="require",
        statement_cache_size=0,
    )
    return _pool


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


def get_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("DB pool is not initialized — call init_pool() first")
    return _pool
