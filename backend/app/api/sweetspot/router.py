"""SweetSpot routes."""
from __future__ import annotations

import logging
from decimal import Decimal
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.deps import get_bunq_client
from app.services.bunq import operations as ops
from app.services.bunq.client import BunqClient
from app.services.serpapi import fetch_products
from app.services import sweetspot

router = APIRouter(prefix="/sweetspot", tags=["sweetspot"])
log = logging.getLogger(__name__)

ClientDep = Annotated[BunqClient, Depends(get_bunq_client)]


class AnalyzeRequest(BaseModel):
    image_url: str


class ProductMatch(BaseModel):
    title: str | None
    price: str | None
    extracted_price: float | None
    link: str | None
    thumbnail: str | None


class ScoreBreakdown(BaseModel):
    price_position: int
    headroom: int
    promotion: int


class AnalyzeResponse(BaseModel):
    sweetspot: bool
    score: int
    tier: str
    reasoning: str
    item_price: float
    disposable: float
    deficit: float
    score_breakdown: ScoreBreakdown
    matches: list[ProductMatch]


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(body: AnalyzeRequest, client: ClientDep) -> AnalyzeResponse:
    # 1. Search SerpApi
    log.info("analyze: image_url=%s", body.image_url)
    try:
        matches = await fetch_products(body.image_url)
    except Exception as exc:
        log.exception("SerpApi search failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    log.info("analyze: %d matches", len(matches))

    prices = _extract_prices(matches)
    log.info("analyze: parsed prices=%s", [float(p) for p in prices])
    if not prices:
        raise HTTPException(status_code=422, detail="No prices found — try a clearer product photo.")

    # 2. Fetch balance + transaction history
    balance_data = await ops.get_balance(client)
    balance = Decimal(str(balance_data["value"]))
    transactions = await ops.list_transactions(client, count=200)
    log.info("analyze: balance=%.2f transactions=%d", balance, len(transactions))

    # 3. Build spending summary and score
    summary = sweetspot.build_spending_summary(balance, transactions)
    log.info("analyze: fixed_monthly=%.2f variable_monthly=%.2f disposable=%.2f", summary.fixed_monthly, summary.variable_monthly, summary.disposable)

    result = sweetspot.score(summary, prices)
    log.info("analyze: sweetspot=%s score=%d tier=%s", result.sweetspot, result.score, result.tier)

    return AnalyzeResponse(
        sweetspot=result.sweetspot,
        score=result.score,
        tier=result.tier,
        reasoning=result.reasoning,
        item_price=float(result.item_price),
        disposable=float(result.disposable),
        deficit=float(result.deficit),
        score_breakdown=ScoreBreakdown(**result.score_breakdown),
        matches=[_to_match(m) for m in matches],
    )


def _extract_prices(matches: list[dict[str, Any]]) -> list[Decimal]:
    prices = []
    for m in matches:
        ep = m.get("extracted_price")
        if isinstance(ep, (int, float)) and not isinstance(ep, bool) and ep > 0:
            prices.append(Decimal(str(ep)))
    return prices


def _to_match(m: dict[str, Any]) -> ProductMatch:
    ep = m.get("extracted_price")
    raw_price = m.get("price")
    if isinstance(raw_price, dict):
        raw_price = raw_price.get("value") or raw_price.get("extracted_value") or str(raw_price)
    return ProductMatch(
        title=m.get("title"),
        price=str(raw_price) if raw_price is not None else None,
        extracted_price=float(ep) if isinstance(ep, (int, float)) and not isinstance(ep, bool) else None,
        link=m.get("link") or m.get("product_link"),
        thumbnail=m.get("thumbnail"),
    )
