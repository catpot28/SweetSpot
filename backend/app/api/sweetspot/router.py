"""SweetSpot routes — built up step by step."""
from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.serpapi import search_products

router = APIRouter(prefix="/sweetspot", tags=["sweetspot"])
log = logging.getLogger(__name__)


class SearchRequest(BaseModel):
    image_url: str


class ProductMatch(BaseModel):
    title: str | None
    price: str | None
    extracted_price: float | None
    link: str | None
    thumbnail: str | None


class SearchResponse(BaseModel):
    product_search_id: str
    matches: list[ProductMatch]


@router.post("/search", response_model=SearchResponse)
async def search(body: SearchRequest) -> SearchResponse:
    """Run a Google Lens product search via SerpApi and return the top matches."""
    log.info("sweetspot/search: image_url=%s", body.image_url)
    try:
        result = await search_products(body.image_url)
    except Exception as exc:
        log.exception("SerpApi search failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    log.info("sweetspot/search: %d matches for search_id=%s", len(result.matches), result.product_search_id)
    return SearchResponse(
        product_search_id=str(result.product_search_id),
        matches=[_to_match(m) for m in result.matches],
    )


def _to_match(m: dict[str, Any]) -> ProductMatch:
    ep = m.get("extracted_price")
    return ProductMatch(
        title=m.get("title"),
        price=m.get("price"),
        extracted_price=float(ep) if isinstance(ep, (int, float)) and not isinstance(ep, bool) else None,
        link=m.get("link") or m.get("product_link"),
        thumbnail=m.get("thumbnail"),
    )
