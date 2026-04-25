"""POST /sweetspot/analyze — score a product purchase against the user's finances."""
from __future__ import annotations

import logging
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, HttpUrl

from app.core.deps import get_bunq_client
from app.services.bunq import operations as ops
from app.services.serpapi import search_products
from app.services import sweetspot
from fastapi import Depends
from typing import Annotated
from app.services.bunq.client import BunqClient

router = APIRouter(prefix="/sweetspot", tags=["sweetspot"])
log = logging.getLogger(__name__)

ClientDep = Annotated[BunqClient, Depends(get_bunq_client)]


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class AnalyzeRequest(BaseModel):
    image_url: str  # public URL of the product photo


class ScoreBreakdown(BaseModel):
    price_position: int
    headroom: int
    promotion: int


class TransactionSummaryOut(BaseModel):
    balance: float
    fixed_monthly: float
    variable_monthly: float
    disposable: float
    transaction_count: int
    days_analyzed: int


class ProductMatch(BaseModel):
    title: str
    price: str | None
    extracted_price: float | None
    link: str | None
    thumbnail: str | None


class AnalyzeResponse(BaseModel):
    tier: str
    emoji: str
    score: int
    message: str
    item_price: float
    disposable: float
    deficit: float
    has_promotion: bool
    score_breakdown: ScoreBreakdown
    transaction_summary: TransactionSummaryOut
    products: list[ProductMatch]


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(body: AnalyzeRequest, client: ClientDep) -> AnalyzeResponse:
    # 1. BUNQ — current balance
    log.info("analyze: fetching balance")
    balance_data = await ops.get_balance(client)
    balance = Decimal(str(balance_data["value"]))
    log.info("balance=%.2f", balance)

    # 2. BUNQ — transaction history (last 200 for a solid monthly average)
    log.info("analyze: fetching transactions")
    transactions = await ops.list_transactions(client, count=200)
    log.info("transactions fetched: count=%d", len(transactions))

    # 3. Build spending summary
    summary = sweetspot.build_transaction_summary(balance, transactions)
    log.info(
        "summary: fixed_monthly=%.2f variable_monthly=%.2f disposable=%.2f days=%d",
        summary.fixed_monthly,
        summary.variable_monthly,
        summary.disposable,
        summary.days_analyzed,
    )

    # 4. SerpApi — find similar products and their prices
    log.info("analyze: calling SerpApi image_url=%s", body.image_url)
    try:
        search_result = await search_products(body.image_url)
    except Exception as exc:
        log.exception("SerpApi call failed")
        raise HTTPException(status_code=502, detail=f"SerpApi error: {exc}") from exc

    matches = search_result.matches
    log.info("serpapi: %d matches returned", len(matches))

    # 5. Extract numeric prices from matches
    prices = _extract_prices(matches)
    log.info("parsed prices: %s", [float(p) for p in prices])

    if not prices:
        raise HTTPException(
            status_code=422,
            detail="SerpApi returned no products with parseable prices. Try a clearer product photo.",
        )

    # 6. Score
    result = sweetspot.analyze(summary, prices)
    log.info("result: tier=%s score=%d item_price=%.2f", result.tier, result.score, result.item_price)

    return AnalyzeResponse(
        tier=result.tier,
        emoji=result.emoji,
        score=result.score,
        message=result.message,
        item_price=float(result.item_price),
        disposable=float(result.disposable),
        deficit=float(result.deficit),
        has_promotion=result.has_promotion,
        score_breakdown=ScoreBreakdown(**result.score_breakdown),
        transaction_summary=TransactionSummaryOut(
            balance=float(result.summary.balance),
            fixed_monthly=float(result.summary.fixed_monthly),
            variable_monthly=float(result.summary.variable_monthly),
            disposable=float(result.summary.disposable),
            transaction_count=result.summary.transaction_count,
            days_analyzed=result.summary.days_analyzed,
        ),
        products=[_to_product_match(m) for m in matches],
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _extract_prices(matches: list[dict[str, Any]]) -> list[Decimal]:
    prices: list[Decimal] = []
    for m in matches:
        ep = m.get("extracted_price")
        if isinstance(ep, (int, float)) and not isinstance(ep, bool) and ep > 0:
            prices.append(Decimal(str(ep)))
            continue
        # Fallback: parse the raw price string
        raw = m.get("price")
        if raw:
            from app.db.price_parser import parse_price
            parsed = parse_price(raw)
            if parsed and parsed > 0:
                prices.append(parsed)
    return prices


def _to_product_match(m: dict[str, Any]) -> ProductMatch:
    ep = m.get("extracted_price")
    return ProductMatch(
        title=m.get("title") or "Unknown product",
        price=m.get("price"),
        extracted_price=float(ep) if isinstance(ep, (int, float)) and not isinstance(ep, bool) else None,
        link=m.get("link") or m.get("product_link"),
        thumbnail=m.get("thumbnail"),
    )
