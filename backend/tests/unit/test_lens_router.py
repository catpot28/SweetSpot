from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from uuid import uuid4

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.api.lens.router import router


@pytest.mark.asyncio
async def test_get_candidates_returns_top_candidates(monkeypatch):
    app = FastAPI()
    app.include_router(router)
    search_id = uuid4()

    async def fake_list_candidates(requested_search_id, limit=3):
        assert requested_search_id == search_id
        assert limit == 3
        timestamp = datetime.now(timezone.utc)
        return [
            {
                "id": uuid4(),
                "user_id": None,
                "initial_search_id": search_id,
                "result_position": 1,
                "title": "Candidate One",
                "merchant_name": "Shop One",
                "product_url": "https://shop.example.com/one",
                "product_image_url": "https://img.example.com/one.jpg",
                "thumbnail_url": "https://img.example.com/one-thumb.jpg",
                "current_price_amount": Decimal("10.99"),
                "currency_code": "USD",
                "in_stock": True,
                "created_at": timestamp,
                "updated_at": timestamp,
            }
        ]

    monkeypatch.setattr("app.api.lens.router.list_candidates", fake_list_candidates)

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        response = await client.get(f"/lens/searches/{search_id}/candidates")

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 1
    assert payload[0]["title"] == "Candidate One"
    assert payload[0]["result_position"] == 1
