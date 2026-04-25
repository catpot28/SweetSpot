from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from uuid import uuid4

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.api.wishlist.router import router


@pytest.mark.asyncio
async def test_get_wishlist_items_returns_persisted_items(monkeypatch):
    app = FastAPI()
    app.include_router(router)
    wishlist_item_id = uuid4()
    candidate_id = uuid4()
    search_id = uuid4()
    timestamp = datetime.now(timezone.utc)

    async def fake_list_wishlist_items():
        return [
            {
                "wishlist_item_id": wishlist_item_id,
                "wishlist_user_id": None,
                "product_candidate_id": candidate_id,
                "note": "saved",
                "current_price_text": "$9.99",
                "currency_code": "USD",
                "stock_status": "In stock",
                "on_discount": True,
                "sweet_spot": False,
                "reasoning": "Wait for a better drop",
                "added_at": timestamp,
                "purchased_at": None,
                "candidate": {
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
                },
            }
        ]

    monkeypatch.setattr(
        "app.api.wishlist.router.list_wishlist_items",
        fake_list_wishlist_items,
    )

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        response = await client.get("/wishlist")

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 1
    assert payload[0]["wishlist_item_id"] == str(wishlist_item_id)
    assert payload[0]["product_candidate_id"] == str(candidate_id)
    assert payload[0]["current_price_text"] == "$9.99"
    assert payload[0]["currency_code"] == "USD"
    assert payload[0]["stock_status"] == "In stock"
    assert payload[0]["on_discount"] is True
    assert payload[0]["sweet_spot"] is False
    assert payload[0]["reasoning"] == "Wait for a better drop"
    assert payload[0]["candidate"]["title"] == "Selected Item"
    assert payload[0]["candidate"]["current_price_text"] == "$10.99"
    assert payload[0]["candidate"]["stock_status"] == "In stock"


@pytest.mark.asyncio
async def test_create_wishlist_item_persists_selected_candidate(monkeypatch):
    app = FastAPI()
    app.include_router(router)
    candidate_id = uuid4()
    wishlist_item_id = uuid4()

    async def fake_add_candidate_to_wishlist(product_candidate_id, note=None):
        assert product_candidate_id == candidate_id
        assert note == "favourite"
        return wishlist_item_id

    async def fake_add_candidate_to_wishlist_with_flags(
        product_candidate_id,
        note=None,
        on_discount=None,
        sweet_spot=None,
        reasoning=None,
    ):
        assert product_candidate_id == candidate_id
        assert note == "favourite"
        assert on_discount is True
        assert sweet_spot is False
        assert reasoning == "Wait for next week"
        return wishlist_item_id

    monkeypatch.setattr(
        "app.api.wishlist.router.add_candidate_to_wishlist",
        fake_add_candidate_to_wishlist_with_flags,
    )

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        response = await client.post(
            "/wishlist",
            json={
                "product_candidate_id": str(candidate_id),
                "note": "favourite",
                "on_discount": True,
                "sweet_spot": False,
                "reasoning": "Wait for next week",
            },
        )

    assert response.status_code == 201
    assert response.json() == {
        "wishlist_item_id": str(wishlist_item_id),
        "product_candidate_id": str(candidate_id),
    }


@pytest.mark.asyncio
async def test_create_wishlist_item_returns_404_for_unknown_candidate(monkeypatch):
    app = FastAPI()
    app.include_router(router)
    candidate_id = uuid4()

    async def fake_add_candidate_to_wishlist(
        product_candidate_id,
        note=None,
        on_discount=None,
        sweet_spot=None,
        reasoning=None,
    ):
        raise LookupError(f"unknown candidate {product_candidate_id}")

    monkeypatch.setattr(
        "app.api.wishlist.router.add_candidate_to_wishlist",
        fake_add_candidate_to_wishlist,
    )

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        response = await client.post(
            "/wishlist",
            json={"product_candidate_id": str(candidate_id)},
        )

    assert response.status_code == 404
    assert "unknown candidate" in response.json()["detail"]
