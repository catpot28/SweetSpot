from __future__ import annotations

from uuid import uuid4

import httpx
import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.api.telegram.router import router
from app.services.serpapi import ProductSearchResult


@pytest.mark.asyncio
async def test_webhook_with_photo_calls_service_and_sends_reply(monkeypatch):
    app = FastAPI()
    app.include_router(router)
    messages = []

    async def fake_upload(image_bytes):
        assert image_bytes == b"image-bytes"
        return "https://img.example.com/uploaded.jpg"

    async def fake_search_products(image_url):
        assert image_url == "https://img.example.com/uploaded.jpg"
        return ProductSearchResult(
            search_image_id=uuid4(),
            product_search_id=uuid4(),
            matches=[
                {
                    "title": "Test Product",
                    "price": "$10",
                    "link": "https://shop.example.com",
                }
            ],
            product_candidate_id=uuid4(),
            wishlist_item_id=uuid4(),
        )

    async def fake_send_message(chat_id, text):
        messages.append((chat_id, text))

    class FakeAsyncClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def get(self, url, params=None):
            if "getFile" in url:
                return _json_response({"result": {"file_path": "photos/image.jpg"}}, url)
            return _bytes_response(b"image-bytes", url)

    monkeypatch.setattr("app.api.telegram.router.upload", fake_upload)
    monkeypatch.setattr("app.api.telegram.router.search_products", fake_search_products)
    monkeypatch.setattr("app.api.telegram.router.send_message", fake_send_message)
    monkeypatch.setattr("app.api.telegram.router.httpx.AsyncClient", FakeAsyncClient)

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        response = await client.post(
            "/telegram/webhook",
            json={
                "message": {
                    "chat": {"id": 42},
                    "photo": [{"file_id": "small"}, {"file_id": "large"}],
                }
            },
        )

    assert response.status_code == 200
    assert response.json() == {"ok": True}
    assert len(messages) == 2
    assert messages[0] == (42, "✅ Image saved! Searching for similar products...")
    assert "Test Product" in messages[1][1]


@pytest.mark.asyncio
async def test_webhook_without_photo_returns_ok_without_work(monkeypatch):
    app = FastAPI()
    app.include_router(router)
    called = {"search": False, "send": False}

    async def fake_search_products(image_url):
        called["search"] = True

    async def fake_send_message(chat_id, text):
        called["send"] = True

    monkeypatch.setattr("app.api.telegram.router.search_products", fake_search_products)
    monkeypatch.setattr("app.api.telegram.router.send_message", fake_send_message)

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        response = await client.post("/telegram/webhook", json={"message": {"chat": {"id": 42}}})

    assert response.status_code == 200
    assert response.json() == {"ok": True}
    assert called == {"search": False, "send": False}


def _json_response(payload, url: str):
    request = httpx.Request("GET", url)
    return httpx.Response(200, json=payload, request=request)


def _bytes_response(payload: bytes, url: str):
    request = httpx.Request("GET", url)
    return httpx.Response(200, content=payload, request=request)
