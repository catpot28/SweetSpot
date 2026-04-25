"""Repository for persisting image searches, product candidates, and wishlist links."""
from __future__ import annotations

from decimal import Decimal
from uuid import UUID

import asyncpg


async def create_search_image(
    pool: asyncpg.Pool,
    *,
    image_url: str,
    user_id: UUID | None = None,
    mime_type: str | None = None,
    width: int | None = None,
    height: int | None = None,
) -> UUID:
    return await pool.fetchval(
        """
        INSERT INTO search_images (user_id, image_url, mime_type, width, height)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
        """,
        user_id,
        image_url,
        mime_type,
        width,
        height,
    )


async def create_product_search(
    pool: asyncpg.Pool,
    *,
    search_image_id: UUID,
    image_url: str,
    user_id: UUID | None = None,
    engine: str = "google_lens",
    search_type: str = "products",
    language_code: str = "en",
    country_code: str = "NL",
    safe_mode: str = "active",
    serpapi_search_id: str | None = None,
    google_lens_url: str | None = None,
    status: str = "success",
) -> UUID:
    return await pool.fetchval(
        """
        INSERT INTO product_searches (
            user_id,
            search_image_id,
            engine,
            search_type,
            image_url,
            language_code,
            country_code,
            safe_mode,
            serpapi_search_id,
            google_lens_url,
            status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (serpapi_search_id) DO UPDATE SET status = EXCLUDED.status
        RETURNING id
        """,
        user_id,
        search_image_id,
        engine,
        search_type,
        image_url,
        language_code,
        country_code,
        safe_mode,
        serpapi_search_id,
        google_lens_url,
        status,
    )


async def create_product_candidate(
    pool: asyncpg.Pool,
    *,
    initial_search_id: UUID,
    result_position: int,
    title: str,
    product_url: str,
    user_id: UUID | None = None,
    merchant_name: str | None = None,
    product_image_url: str | None = None,
    thumbnail_url: str | None = None,
    current_price_text: str | None = None,
    current_price_amount: Decimal | None = None,
    currency_code: str | None = None,
    stock_status: str | None = None,
    in_stock: bool | None = None,
) -> UUID:
    return await pool.fetchval(
        """
        INSERT INTO product_candidates (
            user_id,
            initial_search_id,
            result_position,
            title,
            merchant_name,
            product_url,
            product_image_url,
            thumbnail_url,
            price,
            current_price_amount,
            currency_code,
            stock_status,
            in_stock
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id
        """,
        user_id,
        initial_search_id,
        result_position,
        title,
        merchant_name,
        product_url,
        product_image_url,
        thumbnail_url,
        current_price_text,
        current_price_amount,
        currency_code,
        stock_status,
        in_stock,
    )


async def create_wishlist_item(
    pool: asyncpg.Pool,
    *,
    product_candidate_id: UUID,
    user_id: UUID | None = None,
    note: str | None = None,
    on_discount: bool | None = None,
    sweet_spot: bool | None = None,
    reasoning: str | None = None,
) -> UUID:
    return await pool.fetchval(
        """
        INSERT INTO wishlist_items (
            user_id,
            product_candidate_id,
            note,
            on_discount,
            sweet_spot,
            reasoning
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
        """,
        user_id,
        product_candidate_id,
        note,
        on_discount,
        sweet_spot,
        reasoning,
    )


async def mark_wishlist_item_bought(
    pool: asyncpg.Pool, wishlist_item_id: UUID
) -> UUID | None:
    """Stamp purchased_at = now() on the row. Returns the id if a row was
    updated, None if no such item exists."""
    return await pool.fetchval(
        """
        UPDATE wishlist_items
        SET purchased_at = now()
        WHERE id = $1
        RETURNING id
        """,
        wishlist_item_id,
    )


async def list_product_candidates(
    pool: asyncpg.Pool,
    *,
    initial_search_id: UUID,
    limit: int = 3,
) -> list[asyncpg.Record]:
    return await pool.fetch(
        """
        SELECT
            id,
            user_id,
            initial_search_id,
            result_position,
            title,
            merchant_name,
            product_url,
            product_image_url,
            thumbnail_url,
            price AS current_price_text,
            current_price_amount,
            currency_code,
            stock_status,
            in_stock,
            created_at,
            updated_at
        FROM product_candidates
        WHERE initial_search_id = $1
        ORDER BY result_position ASC
        LIMIT $2
        """,
        initial_search_id,
        limit,
    )


async def get_product_candidate(
    pool: asyncpg.Pool,
    *,
    product_candidate_id: UUID,
) -> asyncpg.Record | None:
    return await pool.fetchrow(
        """
        SELECT
            id,
            user_id,
            initial_search_id,
            result_position,
            title,
            merchant_name,
            product_url,
            product_image_url,
            thumbnail_url,
            price AS current_price_text,
            current_price_amount,
            currency_code,
            stock_status,
            in_stock,
            created_at,
            updated_at
        FROM product_candidates
        WHERE id = $1
        """,
        product_candidate_id,
    )


_WISHLIST_FILTERS = {
    None:       "",
    "discount": "WHERE COALESCE(wi.sweet_spot, false) OR COALESCE(wi.on_discount, false)",
    "bought":   "WHERE wi.purchased_at IS NOT NULL",
}


async def list_wishlist_items(
    pool: asyncpg.Pool, *, filter_: str | None = None
) -> list[asyncpg.Record]:
    """List wishlist items, optionally filtered to "discount" or "bought"."""
    where = _WISHLIST_FILTERS.get(filter_, "")
    return await pool.fetch(
        f"""
        SELECT
            wi.id AS wishlist_item_id,
            wi.user_id AS wishlist_user_id,
            wi.product_candidate_id,
            wi.note,
            wi.on_discount,
            wi.sweet_spot,
            wi.reasoning,
            wi.added_at,
            wi.purchased_at,
            pc.id,
            pc.user_id,
            pc.initial_search_id,
            pc.result_position,
            pc.title,
            pc.merchant_name,
            pc.product_url,
            pc.product_image_url,
            pc.thumbnail_url,
            pc.price AS current_price_text,
            pc.current_price_amount,
            pc.currency_code,
            pc.stock_status,
            pc.in_stock,
            pc.created_at,
            pc.updated_at
        FROM wishlist_items wi
        JOIN product_candidates pc
          ON pc.id = wi.product_candidate_id
        {where}
        ORDER BY wi.added_at DESC
        """
    )
