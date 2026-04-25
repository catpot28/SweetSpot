from __future__ import annotations

from decimal import Decimal
from uuid import uuid4

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.api.sweetspot.router import router
from app.core.deps import get_bunq_client
from app.services.sweetspot import SpendingSummary, SweetSpotResult


def _build_app() -> FastAPI:
    app = FastAPI()
    app.include_router(router)

    async def fake_get_bunq_client():
        yield object()

    app.dependency_overrides[get_bunq_client] = fake_get_bunq_client
    return app


@pytest.mark.asyncio
async def test_search_returns_llm_reasoning_and_updates_wishlist(monkeypatch):
    app = _build_app()
    wishlist_item_id = uuid4()
    update_calls: list[tuple[object, object]] = []

    async def fake_fetch_products(image_url):
        assert image_url == "https://img.example.com/item.jpg"
        return [
            {
                "title": "Headphones",
                "price": "$49.99",
                "extracted_price": 49.99,
                "link": "https://shop.example.com/item",
                "thumbnail": "https://img.example.com/item-thumb.jpg",
            }
        ]

    async def fake_get_balance(client):
        return {"value": "300.00"}

    async def fake_list_transactions(client, count=200):
        return [{"amount": {"value": "10.00"}, "description": "Coffee #variable"}]

    def fake_build_spending_summary(balance, transactions):
        return SpendingSummary(
            balance=Decimal("300.00"),
            fixed_monthly=Decimal("100.00"),
            variable_monthly=Decimal("50.00"),
            disposable=Decimal("150.00"),
            transaction_count=len(transactions),
            days_analyzed=30,
        )

    def fake_score(summary, prices):
        assert prices == [Decimal("49.99")]
        return SweetSpotResult(
            sweetspot=True,
            score=77,
            tier="Sweet Spot",
            reasoning="Heuristic buy signal",
            item_price=Decimal("49.99"),
            disposable=Decimal("150.00"),
            deficit=Decimal("0.00"),
            score_breakdown={"price_position": 60, "headroom": 70, "promotion": 0},
            summary=summary,
        )

    async def fake_generate_sweetspot_reasoning(**kwargs):
        return "Claude says this looks comfortably affordable."

    async def fake_update_wishlist_analysis(wishlist_id, *, reasoning, sweet_spot):
        update_calls.append((wishlist_id, {"reasoning": reasoning, "sweet_spot": sweet_spot}))
        return wishlist_id

    monkeypatch.setattr("app.api.sweetspot.router.fetch_products", fake_fetch_products)
    monkeypatch.setattr("app.api.sweetspot.router.ops.get_balance", fake_get_balance)
    monkeypatch.setattr("app.api.sweetspot.router.ops.list_transactions", fake_list_transactions)
    monkeypatch.setattr(
        "app.api.sweetspot.router.sweetspot.build_spending_summary",
        fake_build_spending_summary,
    )
    monkeypatch.setattr("app.api.sweetspot.router.sweetspot.score", fake_score)
    monkeypatch.setattr(
        "app.api.sweetspot.router.generate_sweetspot_reasoning",
        fake_generate_sweetspot_reasoning,
    )
    monkeypatch.setattr(
        "app.api.sweetspot.router.update_wishlist_analysis",
        fake_update_wishlist_analysis,
    )

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        response = await client.post(
            "/sweetspot/search",
            json={
                "image_url": "https://img.example.com/item.jpg",
                "wishlist_item_id": str(wishlist_item_id),
            },
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["reasoning"] == "Claude says this looks comfortably affordable."
    assert payload["financials"]["balance"] == 300.0
    assert payload["matches"][0]["title"] == "Headphones"
    assert update_calls == [
        (
            wishlist_item_id,
            {
                "reasoning": "Claude says this looks comfortably affordable.",
                "sweet_spot": True,
            },
        )
    ]


@pytest.mark.asyncio
async def test_search_survives_claude_failure_without_wishlist_update(monkeypatch):
    app = _build_app()
    update_called = False

    async def fake_fetch_products(image_url):
        return [{"title": "Watch", "price": "$89.00", "extracted_price": 89.0}]

    async def fake_get_balance(client):
        return {"value": "400.00"}

    async def fake_list_transactions(client, count=200):
        return []

    def fake_build_spending_summary(balance, transactions):
        return SpendingSummary(
            balance=Decimal("400.00"),
            fixed_monthly=Decimal("100.00"),
            variable_monthly=Decimal("50.00"),
            disposable=Decimal("250.00"),
            transaction_count=0,
            days_analyzed=30,
        )

    def fake_score(summary, prices):
        return SweetSpotResult(
            sweetspot=False,
            score=45,
            tier="Affordable",
            reasoning="Heuristic wait signal",
            item_price=Decimal("89.00"),
            disposable=Decimal("250.00"),
            deficit=Decimal("0.00"),
            score_breakdown={"price_position": 20, "headroom": 60, "promotion": 0},
            summary=summary,
        )

    async def fake_generate_sweetspot_reasoning(**kwargs):
        raise RuntimeError("anthropic down")

    async def fake_update_wishlist_analysis(wishlist_id, *, reasoning, sweet_spot):
        nonlocal update_called
        update_called = True

    monkeypatch.setattr("app.api.sweetspot.router.fetch_products", fake_fetch_products)
    monkeypatch.setattr("app.api.sweetspot.router.ops.get_balance", fake_get_balance)
    monkeypatch.setattr("app.api.sweetspot.router.ops.list_transactions", fake_list_transactions)
    monkeypatch.setattr(
        "app.api.sweetspot.router.sweetspot.build_spending_summary",
        fake_build_spending_summary,
    )
    monkeypatch.setattr("app.api.sweetspot.router.sweetspot.score", fake_score)
    monkeypatch.setattr(
        "app.api.sweetspot.router.generate_sweetspot_reasoning",
        fake_generate_sweetspot_reasoning,
    )
    monkeypatch.setattr(
        "app.api.sweetspot.router.update_wishlist_analysis",
        fake_update_wishlist_analysis,
    )

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        response = await client.post(
            "/sweetspot/search",
            json={"image_url": "https://img.example.com/item.jpg"},
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["reasoning"] is None
    assert update_called is False


@pytest.mark.asyncio
async def test_search_returns_404_for_unknown_wishlist_item(monkeypatch):
    app = _build_app()
    wishlist_item_id = uuid4()

    async def fake_fetch_products(image_url):
        return [{"title": "Watch", "price": "$89.00", "extracted_price": 89.0}]

    async def fake_get_balance(client):
        return {"value": "400.00"}

    async def fake_list_transactions(client, count=200):
        return []

    def fake_build_spending_summary(balance, transactions):
        return SpendingSummary(
            balance=Decimal("400.00"),
            fixed_monthly=Decimal("100.00"),
            variable_monthly=Decimal("50.00"),
            disposable=Decimal("250.00"),
            transaction_count=0,
            days_analyzed=30,
        )

    def fake_score(summary, prices):
        return SweetSpotResult(
            sweetspot=True,
            score=70,
            tier="Sweet Spot",
            reasoning="Heuristic buy signal",
            item_price=Decimal("89.00"),
            disposable=Decimal("250.00"),
            deficit=Decimal("0.00"),
            score_breakdown={"price_position": 60, "headroom": 50, "promotion": 0},
            summary=summary,
        )

    async def fake_generate_sweetspot_reasoning(**kwargs):
        return "Buy now."

    async def fake_update_wishlist_analysis(wishlist_id, *, reasoning, sweet_spot):
        raise LookupError(f"unknown wishlist item {wishlist_id}")

    monkeypatch.setattr("app.api.sweetspot.router.fetch_products", fake_fetch_products)
    monkeypatch.setattr("app.api.sweetspot.router.ops.get_balance", fake_get_balance)
    monkeypatch.setattr("app.api.sweetspot.router.ops.list_transactions", fake_list_transactions)
    monkeypatch.setattr(
        "app.api.sweetspot.router.sweetspot.build_spending_summary",
        fake_build_spending_summary,
    )
    monkeypatch.setattr("app.api.sweetspot.router.sweetspot.score", fake_score)
    monkeypatch.setattr(
        "app.api.sweetspot.router.generate_sweetspot_reasoning",
        fake_generate_sweetspot_reasoning,
    )
    monkeypatch.setattr(
        "app.api.sweetspot.router.update_wishlist_analysis",
        fake_update_wishlist_analysis,
    )

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        response = await client.post(
            "/sweetspot/search",
            json={
                "image_url": "https://img.example.com/item.jpg",
                "wishlist_item_id": str(wishlist_item_id),
            },
        )

    assert response.status_code == 404
    assert response.json()["detail"] == f"unknown wishlist item {wishlist_item_id}"
