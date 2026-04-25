from __future__ import annotations

from uuid import uuid4

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.api.wishlist.router import router


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
            json={"product_candidate_id": str(candidate_id), "note": "favourite"},
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

    async def fake_add_candidate_to_wishlist(product_candidate_id, note=None):
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
