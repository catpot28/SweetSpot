from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

import httpx
import pytest

from app.services.serpapi import list_candidates, search_products


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
async def test_search_products_persists_top_three_candidates(monkeypatch):
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
    candidate_ids = [uuid4(), uuid4(), uuid4()]

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

    created_candidates = []

    async def fake_create_product_candidate(pool, **kwargs):
        created_candidates.append(kwargs)
        return candidate_ids[len(created_candidates) - 1]

    monkeypatch.setattr("app.services.serpapi.serpservice.httpx.AsyncClient", FakeAsyncClient)

    async def fake_ensure_pool():
        return object()

    monkeypatch.setattr("app.services.serpapi.serpservice.ensure_pool", fake_ensure_pool)
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

    result = await search_products("https://img.example.com/image.jpg")

    assert result.search_image_id == search_image_id
    assert result.product_search_id == product_search_id
    assert result.candidate_ids == candidate_ids
    assert [match["title"] for match in result.matches] == ["One", "Two", "Three"]
    assert len(created_candidates) == 3
    assert created_candidates[0]["initial_search_id"] == product_search_id
    assert created_candidates[0]["result_position"] == 1
    assert created_candidates[0]["title"] == "One"
    assert created_candidates[0]["product_url"] == "https://shop.example.com/one"
    assert created_candidates[0]["merchant_name"] == "Shop One"
    assert str(created_candidates[0]["current_price_amount"]) == "10.50"
    assert created_candidates[0]["currency_code"] == "USD"
    assert created_candidates[1]["result_position"] == 2
    assert created_candidates[2]["result_position"] == 3


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

    monkeypatch.setattr("app.services.serpapi.serpservice.httpx.AsyncClient", FakeAsyncClient)

    async def fake_ensure_pool():
        return object()

    monkeypatch.setattr("app.services.serpapi.serpservice.ensure_pool", fake_ensure_pool)
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

    monkeypatch.setattr("app.services.serpapi.serpservice.httpx.AsyncClient", FakeAsyncClient)

    async def fake_ensure_pool():
        return object()

    monkeypatch.setattr("app.services.serpapi.serpservice.ensure_pool", fake_ensure_pool)
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

    result = await search_products("https://img.example.com/image.jpg")

    assert result.candidate_ids == []


@pytest.mark.asyncio
async def test_list_candidates_returns_records_sorted_from_repo(monkeypatch):
    search_id = uuid4()
    timestamp = datetime.now(timezone.utc)

    async def fake_ensure_pool():
        return object()

    async def fake_list_product_candidates(pool, **kwargs):
        assert kwargs["initial_search_id"] == search_id
        assert kwargs["limit"] == 3
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
                "current_price_amount": None,
                "currency_code": None,
                "in_stock": True,
                "created_at": timestamp,
                "updated_at": timestamp,
            }
        ]

    monkeypatch.setattr("app.services.serpapi.serpservice.ensure_pool", fake_ensure_pool)
    monkeypatch.setattr(
        "app.services.serpapi.serpservice.product_searches_repo.list_product_candidates",
        fake_list_product_candidates,
    )

    result = await list_candidates(search_id)

    assert len(result) == 1
    assert result[0]["title"] == "Candidate One"
    assert result[0]["result_position"] == 1
