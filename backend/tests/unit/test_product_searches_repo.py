from __future__ import annotations

from decimal import Decimal
from uuid import uuid4

import pytest

from app.db import product_searches_repo


class DummyPool:
    def __init__(self, return_value):
        self.return_value = return_value
        self.calls = []

    async def fetchval(self, query, *args):
        self.calls.append((query, args))
        return self.return_value


@pytest.mark.asyncio
async def test_create_search_image_allows_null_user_id():
    expected_id = uuid4()
    pool = DummyPool(expected_id)

    result = await product_searches_repo.create_search_image(
        pool,
        image_url="https://img.example.com/image.jpg",
        user_id=None,
    )

    assert result == expected_id
    _, args = pool.calls[0]
    assert args[0] is None
    assert args[1] == "https://img.example.com/image.jpg"


@pytest.mark.asyncio
async def test_create_product_search_allows_null_user_id():
    expected_id = uuid4()
    search_image_id = uuid4()
    pool = DummyPool(expected_id)

    result = await product_searches_repo.create_product_search(
        pool,
        search_image_id=search_image_id,
        image_url="https://img.example.com/image.jpg",
        user_id=None,
        serpapi_search_id="search-123",
    )

    assert result == expected_id
    _, args = pool.calls[0]
    assert args[0] is None
    assert args[1] == search_image_id
    assert args[4] == "https://img.example.com/image.jpg"
    assert args[8] == "search-123"


@pytest.mark.asyncio
async def test_create_product_candidate_links_to_initial_search():
    expected_id = uuid4()
    initial_search_id = uuid4()
    pool = DummyPool(expected_id)

    result = await product_searches_repo.create_product_candidate(
        pool,
        initial_search_id=initial_search_id,
        result_position=1,
        title="Candidate Title",
        product_url="https://shop.example.com/item",
        user_id=None,
        merchant_name="Example Shop",
        current_price_text="$19.99",
        current_price_amount=Decimal("19.99"),
        currency_code="USD",
        stock_status="In stock",
    )

    assert result == expected_id
    _, args = pool.calls[0]
    assert args[0] is None
    assert args[1] == initial_search_id
    assert args[2] == 1
    assert args[3] == "Candidate Title"
    assert args[5] == "https://shop.example.com/item"
    assert args[8] == "$19.99"
    assert args[9] == Decimal("19.99")
    assert args[10] == "USD"
    assert args[11] == "In stock"


@pytest.mark.asyncio
async def test_create_wishlist_item_links_to_candidate():
    expected_id = uuid4()
    candidate_id = uuid4()
    pool = DummyPool(expected_id)

    result = await product_searches_repo.create_wishlist_item(
        pool,
        product_candidate_id=candidate_id,
        user_id=None,
        on_discount=True,
        sweet_spot=False,
        reasoning="LLM says wait",
    )

    assert result == expected_id
    _, args = pool.calls[0]
    assert args[0] is None
    assert args[1] == candidate_id
    assert args[3] is True
    assert args[4] is False
    assert args[5] == "LLM says wait"


@pytest.mark.asyncio
async def test_update_wishlist_analysis_preserves_reasoning_when_none():
    expected_id = uuid4()
    wishlist_item_id = uuid4()
    pool = DummyPool(expected_id)

    result = await product_searches_repo.update_wishlist_analysis(
        pool,
        wishlist_item_id=wishlist_item_id,
        reasoning=None,
        sweet_spot=True,
    )

    assert result == expected_id
    _, args = pool.calls[0]
    assert args[0] == wishlist_item_id
    assert args[1] is None
    assert args[2] is True


@pytest.mark.asyncio
async def test_list_product_candidates_orders_by_position_and_limit():
    pool = DummyPool(None)

    async def fetch(query, *args):
        pool.calls.append((query, args))
        return []

    pool.fetch = fetch
    search_id = uuid4()

    result = await product_searches_repo.list_product_candidates(
        pool,
        initial_search_id=search_id,
        limit=3,
    )

    assert result == []
    _, args = pool.calls[0]
    assert args[0] == search_id
    assert args[1] == 3


@pytest.mark.asyncio
async def test_get_product_candidate_queries_by_id():
    pool = DummyPool(None)

    async def fetchrow(query, *args):
        pool.calls.append((query, args))
        return None

    pool.fetchrow = fetchrow
    candidate_id = uuid4()

    result = await product_searches_repo.get_product_candidate(
        pool,
        product_candidate_id=candidate_id,
    )

    assert result is None
    _, args = pool.calls[0]
    assert args[0] == candidate_id


@pytest.mark.asyncio
async def test_list_wishlist_items_joins_candidates():
    pool = DummyPool(None)

    async def fetch(query, *args):
        pool.calls.append((query, args))
        return []

    pool.fetch = fetch

    result = await product_searches_repo.list_wishlist_items(pool)

    assert result == []
    query, args = pool.calls[0]
    assert "FROM wishlist_items wi" in query
    assert "JOIN product_candidates pc" in query
    assert "wi.on_discount" in query
    assert "wi.sweet_spot" in query
    assert "wi.reasoning" in query
    assert args == ()
