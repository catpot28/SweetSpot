from __future__ import annotations

from typing import Any
from uuid import UUID

from app.db import product_searches_repo
from app.db.client import ensure_pool


async def add_candidate_to_wishlist(
    product_candidate_id: UUID,
    *,
    note: str | None = None,
    on_discount: bool | None = None,
    sweet_spot: bool | None = None,
    reasoning: str | None = None,
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
        on_discount=on_discount,
        sweet_spot=sweet_spot,
        reasoning=reasoning,
    )


async def list_wishlist_items() -> list[dict[str, Any]]:
    pool = await ensure_pool()
    rows = await product_searches_repo.list_wishlist_items(pool)
    return [_record_to_wishlist_item(row) for row in rows]


def _record_to_wishlist_item(row: Any) -> dict[str, Any]:
    return {
        "wishlist_item_id": row["wishlist_item_id"],
        "wishlist_user_id": row["wishlist_user_id"],
        "product_candidate_id": row["product_candidate_id"],
        "note": row["note"],
        "on_discount": row["on_discount"],
        "sweet_spot": row["sweet_spot"],
        "reasoning": row["reasoning"],
        "added_at": row["added_at"],
        "candidate": {
            "id": row["id"],
            "user_id": row["user_id"],
            "initial_search_id": row["initial_search_id"],
            "result_position": row["result_position"],
            "title": row["title"],
            "merchant_name": row["merchant_name"],
            "product_url": row["product_url"],
            "product_image_url": row["product_image_url"],
            "thumbnail_url": row["thumbnail_url"],
            "current_price_text": row["current_price_text"],
            "current_price_amount": row["current_price_amount"],
            "currency_code": row["currency_code"],
            "stock_status": row["stock_status"],
            "in_stock": row["in_stock"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        },
    }
