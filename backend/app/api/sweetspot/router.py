"""SweetSpot routes."""
from __future__ import annotations

import logging
import re
from decimal import Decimal, InvalidOperation
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException

from app.api.sweetspot.models import (
    FinancialSummary,
    ProductMatch,
    ScoreBreakdown,
    SearchRequest,
    SearchResponse,
)
from app.core.deps import get_bunq_client
from app.services.anthropic import generate_sweetspot_reasoning
from app.services.bunq import operations as ops
from app.services.bunq.client import BunqClient
from app.services.serpapi import fetch_products
from app.services import sweetspot
from app.services.wishlist import update_wishlist_analysis

router = APIRouter(prefix="/sweetspot", tags=["sweetspot"])
log = logging.getLogger(__name__)

ClientDep = Annotated[BunqClient, Depends(get_bunq_client)]


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
        raise HTTPException(status_code=422, detail="No prices found - try a clearer product photo.")

    balance_data = await ops.get_balance(client)
    balance = Decimal(str(balance_data["value"]))
    transactions = await ops.list_transactions(client, count=200)
    log.info("sweetspot/search: balance=%.2f transactions=%d", balance, len(transactions))

    summary = sweetspot.build_spending_summary(balance, transactions)
    log.info(
        "sweetspot/search: fixed_monthly=%.2f variable_monthly=%.2f disposable=%.2f",
        summary.fixed_monthly,
        summary.variable_monthly,
        summary.disposable,
    )

    result = sweetspot.score(summary, prices)
    log.info("sweetspot/search: sweetspot=%s score=%d", result.sweetspot, result.score)

    financials = FinancialSummary(
        balance=float(summary.balance),
        fixed_monthly=float(summary.fixed_monthly),
        variable_monthly=float(summary.variable_monthly),
        disposable=float(summary.disposable),
        transaction_count=summary.transaction_count,
        days_analyzed=summary.days_analyzed,
    )
    response_matches = [_to_match(m) for m in matches]

    llm_reasoning: str | None = None
    try:
        llm_reasoning = await generate_sweetspot_reasoning(
            search_result=result,
            financial_summary=summary,
            matches=matches,
        )
    except Exception:
        log.exception("sweetspot/search: anthropic reasoning failed")

    if body.wishlist_item_id is not None:
        try:
            await update_wishlist_analysis(
                body.wishlist_item_id,
                reasoning=llm_reasoning,
                sweet_spot=result.sweetspot,
            )
        except LookupError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc

    return SearchResponse(
        sweetspot=result.sweetspot,
        score=result.score,
        reasoning=llm_reasoning,
        item_price=float(result.item_price),
        disposable=float(result.disposable),
        score_breakdown=ScoreBreakdown(**result.score_breakdown),
        financials=financials,
        matches=response_matches,
    )


def _parse_price(match: dict[str, Any]) -> float | None:
    extracted_price = match.get("extracted_price")
    if isinstance(extracted_price, (int, float)) and not isinstance(extracted_price, bool) and extracted_price > 0:
        return float(extracted_price)
    raw_price = match.get("price")
    if isinstance(raw_price, dict):
        raw_price = raw_price.get("value") or raw_price.get("extracted_value")
    if raw_price:
        number_match = re.search(r"\d+(?:[.,]\d+)?", str(raw_price).replace(",", "."))
        if number_match:
            try:
                return float(Decimal(number_match.group()))
            except InvalidOperation:
                pass
    return None


def _to_match(match: dict[str, Any]) -> ProductMatch:
    raw_price = match.get("price")
    if isinstance(raw_price, dict):
        raw_price = raw_price.get("value") or raw_price.get("extracted_value") or str(raw_price)
    return ProductMatch(
        title=match.get("title"),
        price=str(raw_price) if raw_price is not None else None,
        extracted_price=_parse_price(match),
        link=match.get("link") or match.get("product_link"),
        thumbnail=match.get("thumbnail"),
    )
