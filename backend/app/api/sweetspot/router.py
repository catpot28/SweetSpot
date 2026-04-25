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


class SearchResponse(BaseModel):
    matches: list[ProductMatch]


class ScoreRequest(BaseModel):
    prices: list[float]


class ScoreBreakdown(BaseModel):
    price_position: int
    headroom: int
    promotion: int


class ScoreResponse(BaseModel):
    sweetspot: bool
    score: int
    tier: str
    reasoning: str
    item_price: float
    disposable: float
    deficit: float
    score_breakdown: ScoreBreakdown


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/search", response_model=SearchResponse)
async def search(body: SearchRequest) -> SearchResponse:
    """Run a Google Lens product search via SerpApi and return the top matches."""
    log.info("sweetspot/search: image_url=%s", body.image_url)
    try:
        matches = await fetch_products(body.image_url)
    except Exception as exc:
        log.exception("SerpApi search failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    log.info("sweetspot/search: %d matches", len(matches))
    return SearchResponse(matches=[_to_match(m) for m in matches])


@router.post("/score", response_model=ScoreResponse)
async def score(body: ScoreRequest, client: ClientDep) -> ScoreResponse:
    """
    Given a list of prices from /sweetspot/search, score the purchase
    against the user's current BUNQ balance and spending history.
    """
    if not body.prices:
        raise HTTPException(status_code=422, detail="prices list must not be empty")

    # 1. Fetch balance
    log.info("score: fetching balance")
    balance_data = await ops.get_balance(client)
    balance = Decimal(str(balance_data["value"]))
    log.info("balance=%.2f", balance)

    # 2. Fetch transaction history
    log.info("score: fetching transactions")
    transactions = await ops.list_transactions(client, count=200)
    log.info("transactions fetched: %d", len(transactions))

    # 3. Build spending summary
    summary = sweetspot.build_spending_summary(balance, transactions)
    log.info(
        "spending: fixed_monthly=%.2f variable_monthly=%.2f disposable=%.2f days=%d",
        summary.fixed_monthly, summary.variable_monthly, summary.disposable, summary.days_analyzed,
    )

    # 4. Score
    prices = [Decimal(str(p)) for p in body.prices]
    result = sweetspot.score(summary, prices)
    log.info("result: sweetspot=%s score=%d tier=%s", result.sweetspot, result.score, result.tier)

    return ScoreResponse(
        sweetspot=result.sweetspot,
        score=result.score,
        tier=result.tier,
        reasoning=result.reasoning,
        item_price=float(result.item_price),
        disposable=float(result.disposable),
        deficit=float(result.deficit),
        score_breakdown=ScoreBreakdown(**result.score_breakdown),
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

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
