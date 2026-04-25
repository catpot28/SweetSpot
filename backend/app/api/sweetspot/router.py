"""SweetSpot routes."""
from __future__ import annotations

import logging
import re
from decimal import Decimal, InvalidOperation
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException

from uuid import UUID

from app.api.sweetspot.models import (
    FinancialSummary,
    ProductMatch,
    ScoreBreakdown,
    SearchRequest,
    SearchResponse,
    WishlistItemResult,
    WishlistScanResponse,
)
from app.core.deps import get_bunq_client
from app.services.anthropic import generate_sweetspot_reasoning
from app.services.bunq import operations as ops
from app.services.bunq.client import BunqClient
from app.services.serpapi import fetch_products, list_candidates
from app.services import sweetspot
from app.services.wishlist import list_wishlist_items, update_wishlist_analysis

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


@router.post("/wishlist-scan", response_model=WishlistScanResponse)
async def wishlist_scan(client: ClientDep) -> WishlistScanResponse:
    """Score every wishlist item against current finances; write sweet_spot + reasoning to DB."""

    # 1. Fetch finances once — shared across all items
    balance_data = await ops.get_balance(client)
    balance = Decimal(str(balance_data["value"]))
    transactions = await ops.list_transactions(client, count=200)
    summary = sweetspot.build_spending_summary(balance, transactions)
    log.info(
        "wishlist_scan: balance=%.2f disposable=%.2f fixed=%.2f variable=%.2f",
        balance, summary.disposable, summary.fixed_monthly, summary.variable_monthly,
    )

    # 2. Load all wishlist items
    items = await list_wishlist_items()
    log.info("wishlist_scan: %d items to score", len(items))

    results: list[WishlistItemResult] = []

    for item in items:
        wishlist_item_id: UUID = item["wishlist_item_id"]
        candidate = item["candidate"]
        title: str = candidate.get("title") or "Unknown product"
        initial_search_id = candidate.get("initial_search_id")

        # 3. Collect prices from all sibling candidates (price spread for score)
        siblings: list[dict[str, Any]] = []
        if initial_search_id:
            try:
                siblings = await list_candidates(UUID(str(initial_search_id)), limit=10)
            except Exception:
                log.warning("wishlist_scan: could not fetch siblings for %s", title)

        prices = [
            Decimal(str(s["current_price_amount"]))
            for s in siblings
            if s.get("current_price_amount") is not None
        ]

        # Fallback: use own price if no siblings have amounts
        if not prices:
            own = candidate.get("current_price_amount")
            if own is not None:
                prices = [Decimal(str(own))]

        if not prices:
            log.warning("wishlist_scan: no prices for '%s' — skipping score", title)
            results.append(WishlistItemResult(
                wishlist_item_id=str(wishlist_item_id),
                title=title,
                sweet_spot=False,
                score=0,
                tier="Unknown",
                item_price=None,
                reasoning="No price data available for this item.",
                updated=False,
            ))
            continue

        # 4. Score
        score_result = sweetspot.score(summary, prices)
        log.info("wishlist_scan: '%s' → tier=%s score=%d", title, score_result.tier, score_result.score)

        # 5. Anthropic reasoning (best-effort — formula reasoning used as fallback)
        reasoning: str | None = score_result.reasoning
        try:
            reasoning = await generate_sweetspot_reasoning(
                search_result=score_result,
                financial_summary=summary,
                matches=[
                    {
                        "title": s.get("title"),
                        "price": s.get("current_price_text"),
                        "extracted_price": s.get("current_price_amount"),
                    }
                    for s in siblings
                ],
            )
        except Exception:
            log.warning("wishlist_scan: anthropic failed for '%s', keeping formula reasoning", title)

        # 6. Write sweet_spot + reasoning back to DB
        updated = False
        try:
            await update_wishlist_analysis(
                wishlist_item_id,
                reasoning=reasoning,
                sweet_spot=score_result.sweetspot,
            )
            updated = True
        except Exception:
            log.exception("wishlist_scan: DB write failed for '%s'", title)

        results.append(WishlistItemResult(
            wishlist_item_id=str(wishlist_item_id),
            title=title,
            sweet_spot=score_result.sweetspot,
            score=score_result.score,
            tier=score_result.tier,
            item_price=float(score_result.item_price),
            reasoning=reasoning,
            updated=updated,
        ))

    sweet_spot_count = sum(1 for r in results if r.sweet_spot)
    log.info("wishlist_scan: done — %d/%d in sweet spot", sweet_spot_count, len(results))

    return WishlistScanResponse(
        items_scanned=len(results),
        sweet_spot_count=sweet_spot_count,
        financials=FinancialSummary(
            balance=float(summary.balance),
            fixed_monthly=float(summary.fixed_monthly),
            variable_monthly=float(summary.variable_monthly),
            disposable=float(summary.disposable),
            transaction_count=summary.transaction_count,
            days_analyzed=summary.days_analyzed,
        ),
        results=results,
    )


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
