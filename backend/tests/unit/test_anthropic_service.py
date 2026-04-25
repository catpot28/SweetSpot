from __future__ import annotations

from decimal import Decimal

import pytest

from app.services.anthropic.service import generate_sweetspot_reasoning
from app.services.sweetspot import SpendingSummary, SweetSpotResult


class DummyResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self) -> None:
        return None

    def json(self):
        return self._payload


@pytest.mark.asyncio
async def test_generate_sweetspot_reasoning_sends_expected_payload(monkeypatch):
    captured: dict[str, object] = {}

    class DummyClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def post(self, url, headers=None, json=None):
            captured["url"] = url
            captured["headers"] = headers
            captured["json"] = json
            return DummyResponse(
                {"content": [{"type": "text", "text": "This buy looks safe right now."}]}
            )

    monkeypatch.setattr("app.services.anthropic.service.httpx.AsyncClient", DummyClient)
    monkeypatch.setattr("app.services.anthropic.service.settings.anthropic_api_key", "test-key")

    result = await generate_sweetspot_reasoning(
        search_result=SweetSpotResult(
            sweetspot=True,
            score=78,
            tier="Sweet Spot",
            reasoning="Heuristic says buy.",
            item_price=Decimal("49.99"),
            disposable=Decimal("160.00"),
            deficit=Decimal("0.00"),
            score_breakdown={"price_position": 50, "headroom": 60, "promotion": 0},
            summary=SpendingSummary(
                balance=Decimal("300.00"),
                fixed_monthly=Decimal("100.00"),
                variable_monthly=Decimal("40.00"),
                disposable=Decimal("160.00"),
                transaction_count=12,
                days_analyzed=30,
            ),
        ),
        financial_summary=SpendingSummary(
            balance=Decimal("300.00"),
            fixed_monthly=Decimal("100.00"),
            variable_monthly=Decimal("40.00"),
            disposable=Decimal("160.00"),
            transaction_count=12,
            days_analyzed=30,
        ),
        matches=[
            {
                "title": "Camera",
                "price": "$49.99",
                "extracted_price": 49.99,
                "link": "https://shop.example.com/camera",
                "thumbnail": "https://img.example.com/camera.jpg",
            }
        ],
    )

    assert result == "This buy looks safe right now."
    assert captured["url"] == "https://api.anthropic.com/v1/messages"
    assert captured["headers"]["x-api-key"] == "test-key"
    body = captured["json"]
    assert body["model"] == "claude-sonnet-4-20250514"
    content = body["messages"][0]["content"]
    assert "\"score\":78" in content
    assert "\"balance\":300.0" in content
    assert "\"title\":\"Camera\"" in content


@pytest.mark.asyncio
async def test_generate_sweetspot_reasoning_normalizes_text(monkeypatch):
    class DummyClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def post(self, url, headers=None, json=None):
            return DummyResponse(
                {
                    "content": [
                        {"type": "text", "text": "  Buy now.\n"},
                        {"type": "text", "text": " You still keep good buffer.  "},
                    ]
                }
            )

    monkeypatch.setattr("app.services.anthropic.service.httpx.AsyncClient", DummyClient)
    monkeypatch.setattr("app.services.anthropic.service.settings.anthropic_api_key", "test-key")

    result = await generate_sweetspot_reasoning(
        search_result=SweetSpotResult(
            sweetspot=True,
            score=82,
            tier="Sweet Spot",
            reasoning="Heuristic reasoning",
            item_price=Decimal("39.99"),
            disposable=Decimal("180.00"),
            deficit=Decimal("0.00"),
            score_breakdown={"price_position": 70, "headroom": 65, "promotion": 0},
            summary=SpendingSummary(
                balance=Decimal("300.00"),
                fixed_monthly=Decimal("80.00"),
                variable_monthly=Decimal("40.00"),
                disposable=Decimal("180.00"),
                transaction_count=8,
                days_analyzed=30,
            ),
        ),
        financial_summary=SpendingSummary(
            balance=Decimal("300.00"),
            fixed_monthly=Decimal("80.00"),
            variable_monthly=Decimal("40.00"),
            disposable=Decimal("180.00"),
            transaction_count=8,
            days_analyzed=30,
        ),
        matches=[],
    )

    assert result == "Buy now. You still keep good buffer."
