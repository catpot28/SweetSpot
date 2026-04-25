from __future__ import annotations

from uuid import uuid4

import httpx
import pytest

from app.services.serpapi import search_products


class FakeAsyncClient:
    payload = {}
    requests = []

    def __init__(self, *args, **kwargs):
        self.timeout = kwargs.get("timeout")

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def get(self, url, params=None):
        self.__class__.requests.append((url, params))
        request = httpx.Request("GET", url, params=params)
        return httpx.Response(200, json=self.__class__.payload, request=request)


@pytest.mark.asyncio
async def test_search_products_persists_search_candidate_and_wishlist_item(monkeypatch):
    payload = {
        "search_metadata": {
            "id": "search-123",
            "status": "success",
            "google_lens_url": "https://lens.google.com/search",
        },
        "visual_matches": [
            {
                "title": "One",
                "link": "https://shop.example.com/one",
                "source": "Shop One",
                "price": "$10.50",
                "thumbnail": "https://img.example.com/thumb-one.jpg",
                "image": "https://img.example.com/product-one.jpg",
                "in_stock": True,
            },
            {"title": "Two", "link": "https://shop.example.com/two"},
            {"title": "Three", "link": "https://shop.example.com/three"},
            {"title": "Four", "link": "https://shop.example.com/four"},
        ],
    }
    search_image_id = uuid4()
    product_search_id = uuid4()
    product_candidate_id = uuid4()
    wishlist_item_id = uuid4()

    FakeAsyncClient.payload = payload
    FakeAsyncClient.requests = []

    async def fake_create_search_image(pool, **kwargs):
        assert kwargs["image_url"] == "https://img.example.com/image.jpg"
        return search_image_id

    async def fake_create_product_search(pool, **kwargs):
        assert kwargs["search_image_id"] == search_image_id
        assert kwargs["serpapi_search_id"] == "search-123"
        assert kwargs["google_lens_url"] == "https://lens.google.com/search"
        assert kwargs["status"] == "success"
        return product_search_id

    async def fake_create_product_candidate(pool, **kwargs):
        assert kwargs["initial_search_id"] == product_search_id
        assert kwargs["result_position"] == 1
        assert kwargs["title"] == "One"
        assert kwargs["product_url"] == "https://shop.example.com/one"
        assert kwargs["merchant_name"] == "Shop One"
        assert str(kwargs["current_price_amount"]) == "10.50"
        assert kwargs["currency_code"] == "USD"
        return product_candidate_id

    async def fake_create_wishlist_item(pool, **kwargs):
        assert kwargs["product_candidate_id"] == product_candidate_id
        return wishlist_item_id

    monkeypatch.setattr("app.services.serpapi.serpservice.httpx.AsyncClient", FakeAsyncClient)
    monkeypatch.setattr("app.services.serpapi.serpservice.get_pool", lambda: object())
    monkeypatch.setattr(
        "app.services.serpapi.serpservice.product_searches_repo.create_search_image",
        fake_create_search_image,
    )
    monkeypatch.setattr(
        "app.services.serpapi.serpservice.product_searches_repo.create_product_search",
        fake_create_product_search,
    )
    monkeypatch.setattr(
        "app.services.serpapi.serpservice.product_searches_repo.create_product_candidate",
        fake_create_product_candidate,
    )
    monkeypatch.setattr(
        "app.services.serpapi.serpservice.product_searches_repo.create_wishlist_item",
        fake_create_wishlist_item,
    )

    result = await search_products("https://img.example.com/image.jpg")

    assert result.search_image_id == search_image_id
    assert result.product_search_id == product_search_id
    assert result.product_candidate_id == product_candidate_id
    assert result.wishlist_item_id == wishlist_item_id
    assert [match["title"] for match in result.matches] == ["One", "Two", "Three"]


@pytest.mark.asyncio
async def test_search_products_uses_fallback_results_when_visual_matches_missing(monkeypatch):
    payload = {
        "search_metadata": {"id": "search-123"},
        "inline_shopping_results": [
            {"title": "Fallback One", "product_link": "https://shop.example.com/fallback-one"},
            {"title": "Fallback Two", "product_link": "https://shop.example.com/fallback-two"},
        ],
    }

    FakeAsyncClient.payload = payload
    FakeAsyncClient.requests = []

    async def fake_create_search_image(pool, **kwargs):
        return uuid4()

    async def fake_create_product_search(pool, **kwargs):
        return uuid4()

    async def fake_create_product_candidate(pool, **kwargs):
        assert kwargs["title"] == "Fallback One"
        assert kwargs["product_url"] == "https://shop.example.com/fallback-one"
        return uuid4()

    async def fake_create_wishlist_item(pool, **kwargs):
        return uuid4()

    monkeypatch.setattr("app.services.serpapi.serpservice.httpx.AsyncClient", FakeAsyncClient)
    monkeypatch.setattr("app.services.serpapi.serpservice.get_pool", lambda: object())
    monkeypatch.setattr(
        "app.services.serpapi.serpservice.product_searches_repo.create_search_image",
        fake_create_search_image,
    )
    monkeypatch.setattr(
        "app.services.serpapi.serpservice.product_searches_repo.create_product_search",
        fake_create_product_search,
    )
    monkeypatch.setattr(
        "app.services.serpapi.serpservice.product_searches_repo.create_product_candidate",
        fake_create_product_candidate,
    )
    monkeypatch.setattr(
        "app.services.serpapi.serpservice.product_searches_repo.create_wishlist_item",
        fake_create_wishlist_item,
    )

    result = await search_products("https://img.example.com/image.jpg")

    assert [match["title"] for match in result.matches] == ["Fallback One", "Fallback Two"]


@pytest.mark.asyncio
async def test_search_products_skips_candidate_persistence_when_no_linkable_match(monkeypatch):
    payload = {
        "search_metadata": {"id": "search-123"},
        "visual_matches": [
            {"title": "No Link"},
            {"link": "https://shop.example.com/no-title"},
        ],
    }

    FakeAsyncClient.payload = payload
    FakeAsyncClient.requests = []

    async def fake_create_search_image(pool, **kwargs):
        return uuid4()

    async def fake_create_product_search(pool, **kwargs):
        return uuid4()

    async def unexpected_create_product_candidate(pool, **kwargs):
        raise AssertionError("candidate should not be persisted without title and link")

    async def unexpected_create_wishlist_item(pool, **kwargs):
        raise AssertionError("wishlist item should not be created without candidate")

    monkeypatch.setattr("app.services.serpapi.serpservice.httpx.AsyncClient", FakeAsyncClient)
    monkeypatch.setattr("app.services.serpapi.serpservice.get_pool", lambda: object())
    monkeypatch.setattr(
        "app.services.serpapi.serpservice.product_searches_repo.create_search_image",
        fake_create_search_image,
    )
    monkeypatch.setattr(
        "app.services.serpapi.serpservice.product_searches_repo.create_product_search",
        fake_create_product_search,
    )
    monkeypatch.setattr(
        "app.services.serpapi.serpservice.product_searches_repo.create_product_candidate",
        unexpected_create_product_candidate,
    )
    monkeypatch.setattr(
        "app.services.serpapi.serpservice.product_searches_repo.create_wishlist_item",
        unexpected_create_wishlist_item,
    )

    result = await search_products("https://img.example.com/image.jpg")

    assert result.product_candidate_id is None
    assert result.wishlist_item_id is None
