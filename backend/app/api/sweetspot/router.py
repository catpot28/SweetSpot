"""SweetSpot routes."""
from __future__ import annotations

import logging
import re
from decimal import Decimal, InvalidOperation
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


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class SearchRequest(BaseModel):
    image_url: str


class ProductMatch(BaseModel):
    title: str | None
    price: str | None
    extracted_price: float | None
    link: str | None
    thumbnail: str | None


class FinancialSummary(BaseModel):
    balance: float
    fixed_monthly: float
    variable_monthly: float
    disposable: float
    transaction_count: int
    days_analyzed: int


class ScoreBreakdown(BaseModel):
    price_position: int
    headroom: int
    promotion: int


class SearchResponse(BaseModel):
    sweetspot: bool
    score: int
    reasoning: str
    item_price: float
    disposable: float
    score_breakdown: ScoreBreakdown
    financials: FinancialSummary
    matches: list[ProductMatch]


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("/search", response_model=SearchResponse)
async def search(body: SearchRequest, client: ClientDep) -> SearchResponse:
    """Search SerpApi by image, score against user finances, return full result."""
    log.info("sweetspot/search: image_url=%s", body.image_url)
    try:
        matches = await fetch_products(body.image_url)
    except Exception as exc:
        log.exception("SerpApi search failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    log.info("sweetspot/search: %d matches", len(matches))

    prices = [Decimal(str(p)) for m in matches if (p := _parse_price(m)) is not None]
    log.info("sweetspot/search: prices=%s", [float(p) for p in prices])
    if not prices:
        raise HTTPException(status_code=422, detail="No prices found — try a clearer product photo.")

    balance_data = await ops.get_balance(client)
    balance = Decimal(str(balance_data["value"]))
    transactions = await ops.list_transactions(client, count=200)
    log.info("sweetspot/search: balance=%.2f transactions=%d", balance, len(transactions))

    summary = sweetspot.build_spending_summary(balance, transactions)
    log.info("sweetspot/search: fixed_monthly=%.2f variable_monthly=%.2f disposable=%.2f",
             summary.fixed_monthly, summary.variable_monthly, summary.disposable)

    result = sweetspot.score(summary, prices)
    log.info("sweetspot/search: sweetspot=%s score=%d", result.sweetspot, result.score)

    return SearchResponse(
        sweetspot=result.sweetspot,
        score=result.score,
        reasoning=result.reasoning,
        item_price=float(result.item_price),
        disposable=float(result.disposable),
        score_breakdown=ScoreBreakdown(**result.score_breakdown),
        financials=FinancialSummary(
            balance=float(summary.balance),
            fixed_monthly=float(summary.fixed_monthly),
            variable_monthly=float(summary.variable_monthly),
            disposable=float(summary.disposable),
            transaction_count=summary.transaction_count,
            days_analyzed=summary.days_analyzed,
        ),
        matches=[_to_match(m) for m in matches],
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_price(m: dict[str, Any]) -> float | None:
    ep = m.get("extracted_price")
    if isinstance(ep, (int, float)) and not isinstance(ep, bool) and ep > 0:
        return float(ep)
    raw = m.get("price")
    if isinstance(raw, dict):
        raw = raw.get("value") or raw.get("extracted_value")
    if raw:
        match = re.search(r"\d+(?:[.,]\d+)?", str(raw).replace(",", "."))
        if match:
            try:
                return float(Decimal(match.group()))
            except InvalidOperation:
                pass
    return None


def _to_match(m: dict[str, Any]) -> ProductMatch:
    raw_price = m.get("price")
    if isinstance(raw_price, dict):
        raw_price = raw_price.get("value") or raw_price.get("extracted_value") or str(raw_price)
    return ProductMatch(
        title=m.get("title"),
        price=str(raw_price) if raw_price is not None else None,
        extracted_price=_parse_price(m),
        link=m.get("link") or m.get("product_link"),
        thumbnail=m.get("thumbnail"),
    )
