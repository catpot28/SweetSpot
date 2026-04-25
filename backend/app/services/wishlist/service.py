from __future__ import annotations

from uuid import UUID

from app.db import product_searches_repo
from app.db.client import ensure_pool


async def add_candidate_to_wishlist(
    product_candidate_id: UUID,
    *,
    note: str | None = None,
) -> UUID:
    pool = await ensure_pool()
    candidate = await product_searches_repo.get_product_candidate(
        pool,
        product_candidate_id=product_candidate_id,
    )
    if candidate is None:
        raise LookupError(f"unknown candidate {product_candidate_id}")

    return await product_searches_repo.create_wishlist_item(
        pool,
        product_candidate_id=product_candidate_id,
        note=note,
    )
