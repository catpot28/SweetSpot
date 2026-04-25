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
from app.services.sweetspot import build_spending_summary

router = APIRouter(prefix="/sweetspot", tags=["sweetspot"])
log = logging.getLogger(__name__)

ClientDep = Annotated[BunqClient, Depends(get_bunq_client)]


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


class SearchResponse(BaseModel):
    matches: list[ProductMatch]
    financials: FinancialSummary


@router.post("/search", response_model=SearchResponse)
async def search(body: SearchRequest, client: ClientDep) -> SearchResponse:
    # 1. SerpApi search
    log.info("sweetspot/search: image_url=%s", body.image_url)
    try:
        matches = await fetch_products(body.image_url)
    except Exception as exc:
        log.exception("SerpApi search failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    log.info("sweetspot/search: %d matches", len(matches))

    # 2. BUNQ balance + transactions
    balance_data = await ops.get_balance(client)
    balance = Decimal(str(balance_data["value"]))
    transactions = await ops.list_transactions(client, count=200)
    log.info("sweetspot/search: balance=%.2f transactions=%d", balance, len(transactions))

    # 3. Identify fixed and variable costs from transaction tags
    summary = build_spending_summary(balance, transactions)
    log.info(
        "sweetspot/search: fixed_monthly=%.2f variable_monthly=%.2f disposable=%.2f",
        summary.fixed_monthly, summary.variable_monthly, summary.disposable,
    )

    return SearchResponse(
        matches=[_to_match(m) for m in matches],
        financials=FinancialSummary(
            balance=float(summary.balance),
            fixed_monthly=float(summary.fixed_monthly),
            variable_monthly=float(summary.variable_monthly),
            disposable=float(summary.disposable),
            transaction_count=summary.transaction_count,
            days_analyzed=summary.days_analyzed,
        ),
    )


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
