from __future__ import annotations

import json
from typing import Any, Sequence

import httpx

from app.core.config import settings
from app.services.sweetspot import SpendingSummary, SweetSpotResult

_ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
_ANTHROPIC_VERSION = "2023-06-01"
_MODEL = "claude-sonnet-4-20250514"

_SYSTEM_PROMPT = (
    "You write short, clear purchase guidance for a consumer app. "
    "Given a SweetSpot affordability assessment, a Bunq-derived spending summary, "
    "and the top product search matches, write 2-3 concise sentences in plain text. "
    "Address the user directly, synthesize affordability and deal quality, and explain "
    "whether buying now looks sensible. Do not use markdown, bullet points, or JSON."
)


async def generate_sweetspot_reasoning(
    *,
    search_result: SweetSpotResult,
    financial_summary: SpendingSummary,
    matches: Sequence[dict[str, Any]],
) -> str:
    if not settings.anthropic_api_key:
        raise RuntimeError("ANTHROPIC_API_KEY is not set")

    payload = _build_prompt_payload(
        search_result=search_result,
        financial_summary=financial_summary,
        matches=matches,
    )

    headers = {
        "x-api-key": settings.anthropic_api_key,
        "anthropic-version": _ANTHROPIC_VERSION,
        "content-type": "application/json",
    }
    body = {
        "model": _MODEL,
        "max_tokens": 220,
        "temperature": 0.2,
        "system": _SYSTEM_PROMPT,
        "messages": [
            {
                "role": "user",
                "content": (
                    "Summarize this purchase decision for the user in plain text:\n"
                    f"{json.dumps(payload, ensure_ascii=True, separators=(',', ':'))}"
                ),
            }
        ],
    }

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(_ANTHROPIC_URL, headers=headers, json=body)
        response.raise_for_status()
        data = response.json()

    text = _extract_text(data)
    if not text:
        raise RuntimeError("Anthropic returned no text content")
    return text


def _build_prompt_payload(
    *,
    search_result: SweetSpotResult,
    financial_summary: SpendingSummary,
    matches: Sequence[dict[str, Any]],
) -> dict[str, Any]:
    return {
        "sweetspot_result": {
            "sweetspot": search_result.sweetspot,
            "score": search_result.score,
            "tier": search_result.tier,
            "reasoning": search_result.reasoning,
            "item_price": float(search_result.item_price),
            "disposable": float(search_result.disposable),
            "deficit": float(search_result.deficit),
            "score_breakdown": search_result.score_breakdown,
        },
        "financial_summary": {
            "balance": float(financial_summary.balance),
            "fixed_monthly": float(financial_summary.fixed_monthly),
            "variable_monthly": float(financial_summary.variable_monthly),
            "disposable": float(financial_summary.disposable),
            "transaction_count": financial_summary.transaction_count,
            "days_analyzed": financial_summary.days_analyzed,
        },
        "matches": [
            {
                "title": match.get("title"),
                "price": match.get("price"),
                "extracted_price": match.get("extracted_price"),
                "link": match.get("link") or match.get("product_link"),
                "thumbnail": match.get("thumbnail"),
            }
            for match in matches[:3]
        ],
    }


def _extract_text(data: dict[str, Any]) -> str:
    content = data.get("content")
    if not isinstance(content, list):
        return ""

    text_parts: list[str] = []
    for item in content:
        if not isinstance(item, dict):
            continue
        if item.get("type") != "text":
            continue
        text = item.get("text")
        if isinstance(text, str) and text.strip():
            text_parts.append(text.strip())

    return " ".join(" ".join(text_parts).split())
