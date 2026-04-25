from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from uuid import uuid4

import pytest

from app.services.wishlist import list_wishlist_items


@pytest.mark.asyncio
async def test_list_wishlist_items_maps_joined_rows(monkeypatch):
    wishlist_item_id = uuid4()
    candidate_id = uuid4()
    search_id = uuid4()
    timestamp = datetime.now(timezone.utc)

    async def fake_ensure_pool():
        return object()

    async def fake_list_wishlist_items_repo(pool):
        return [
            {
                "wishlist_item_id": wishlist_item_id,
                "wishlist_user_id": None,
                "product_candidate_id": candidate_id,
                "note": "saved",
                "on_discount": True,
                "sweet_spot": False,
                "reasoning": "Wait for next week",
                "added_at": timestamp,
                "id": candidate_id,
                "user_id": None,
                "initial_search_id": search_id,
                "result_position": 1,
                "title": "Selected Item",
                "merchant_name": "Shop One",
                "product_url": "https://shop.example.com/item",
                "product_image_url": "https://img.example.com/item.jpg",
                "thumbnail_url": "https://img.example.com/item-thumb.jpg",
                "current_price_text": "$10.99",
                "current_price_amount": Decimal("10.99"),
                "currency_code": "USD",
                "stock_status": "In stock",
                "in_stock": True,
                "created_at": timestamp,
                "updated_at": timestamp,
            }
        ]

    monkeypatch.setattr("app.services.wishlist.service.ensure_pool", fake_ensure_pool)
    monkeypatch.setattr(
        "app.services.wishlist.service.product_searches_repo.list_wishlist_items",
        fake_list_wishlist_items_repo,
    )

    result = await list_wishlist_items()

    assert len(result) == 1
    assert result[0]["wishlist_item_id"] == wishlist_item_id
    assert result[0]["on_discount"] is True
    assert result[0]["sweet_spot"] is False
    assert result[0]["reasoning"] == "Wait for next week"
    assert result[0]["candidate"]["title"] == "Selected Item"
    assert result[0]["candidate"]["current_price_text"] == "$10.99"
    assert result[0]["candidate"]["current_price_amount"] == Decimal("10.99")
    assert result[0]["candidate"]["stock_status"] == "In stock"


@pytest.mark.asyncio
async def test_update_wishlist_analysis_updates_reasoning_and_sweetspot(monkeypatch):
    wishlist_item_id = uuid4()

    async def fake_ensure_pool():
        return object()

    async def fake_update_wishlist_analysis_repo(
        pool,
        *,
        wishlist_item_id: object,
        reasoning: str | None,
        sweet_spot: bool,
    ):
        assert wishlist_item_id is not None
        assert reasoning == "Looks safe"
        assert sweet_spot is True
        return wishlist_item_id

    monkeypatch.setattr("app.services.wishlist.service.ensure_pool", fake_ensure_pool)
    monkeypatch.setattr(
        "app.services.wishlist.service.product_searches_repo.update_wishlist_analysis",
        fake_update_wishlist_analysis_repo,
    )

    from app.services.wishlist import update_wishlist_analysis

    result = await update_wishlist_analysis(
        wishlist_item_id,
        reasoning="Looks safe",
        sweet_spot=True,
    )

    assert result == wishlist_item_id
