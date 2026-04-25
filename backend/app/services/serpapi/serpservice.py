from __future__ import annotations

import logging
import re
from decimal import Decimal, InvalidOperation
from typing import Any
from uuid import UUID

import httpx

from app.core.config import settings
from app.db import product_searches_repo
from app.db.client import ensure_pool
from app.services.serpapi.models import PersistableCandidate, ProductSearchResult

log = logging.getLogger(__name__)
_SEARCH_URL = "https://serpapi.com/search"
_LANGUAGE_CODE = "en"
_COUNTRY_CODE = "NL"
_SAFE_MODE = "active"

_CURRENCY_SYMBOLS = {
    "$": "USD",
    "\u20ac": "EUR",
    "\u00a3": "GBP",
}


async def _call_serpapi(image_url: str) -> dict[str, Any]:
    """Make the SerpApi HTTP call and return the raw response JSON."""
    params = {
        "engine": "google_lens",
        "url": image_url,
        "hl": _LANGUAGE_CODE,
        "country": _COUNTRY_CODE.lower(),
        "search_type": "products",
        "safe": _SAFE_MODE,
        "auto_crop": "true",
        "api_key": settings.serpapi_key,
    }
    async with httpx.AsyncClient(timeout=30) as client:
        res = await client.get(_SEARCH_URL, params=params)
        res.raise_for_status()
        return res.json()


async def fetch_products(image_url: str) -> list[dict[str, Any]]:
    """Call SerpApi and return the top 3 matches. No database interaction."""
    data = await _call_serpapi(image_url)
    log.info("SerpApi response keys: %s", list(data.keys()))
    matches = _extract_matches(data)
    log.info("fetch_products: %d matches for image_url=%s", len(matches), image_url)
    return matches[:3]


async def search_products(image_url: str) -> ProductSearchResult:
    """
    Search Google Lens via SerpApi for product matches.
    Persists the search metadata and top candidates for later selection.
    """
    data = await _call_serpapi(image_url)
    log.info("SerpApi full response keys: %s", list(data.keys()))
    matches = _extract_matches(data)
    log.info("About to ensure DB pool for search persistence; image_url=%s matches=%d", image_url, len(matches))
    pool = await ensure_pool()
    log.info("DB pool available; persisting search image")
    search_image_id = await product_searches_repo.create_search_image(
        pool,
        image_url=image_url,
    )
    log.info("Persisted search image id=%s; creating product search", search_image_id)
    product_search_id = await product_searches_repo.create_product_search(
        pool,
        search_image_id=search_image_id,
        image_url=image_url,
        language_code=_LANGUAGE_CODE,
        country_code=_COUNTRY_CODE,
        safe_mode=_SAFE_MODE,
        serpapi_search_id=_get_search_id(data),
        google_lens_url=_get_google_lens_url(data),
        status=_get_status(data),
    )
    log.info("Persisted product search id=%s", product_search_id)

    candidate_ids: list[UUID] = []
    for candidate in _select_top_candidates(matches, limit=3):
        candidate_id = await product_searches_repo.create_product_candidate(
            pool,
            initial_search_id=product_search_id,
            result_position=candidate.result_position,
            title=candidate.title,
            product_url=candidate.product_url,
            merchant_name=candidate.merchant_name,
            product_image_url=candidate.product_image_url,
            thumbnail_url=candidate.thumbnail_url,
            current_price_amount=candidate.current_price_amount,
            currency_code=candidate.currency_code,
            in_stock=candidate.in_stock,
        )
        candidate_ids.append(candidate_id)

    top_matches = matches[:3]
    log.info(
        "SerpApi returned %d matches, persisted search_id=%s candidate_ids=%s top 3=%s",
        len(matches),
        product_search_id,
        candidate_ids,
        [m.get("title") for m in top_matches],
    )
    return ProductSearchResult(
        search_image_id=search_image_id,
        product_search_id=product_search_id,
        matches=top_matches,
        candidate_ids=candidate_ids,
    )


def _extract_matches(data: dict[str, Any]) -> list[dict[str, Any]]:
    matches = (
        data.get("visual_matches")
        or data.get("shopping_results")
        or data.get("inline_shopping_results")
        or []
    )
    return [match for match in matches if isinstance(match, dict)]


def _select_top_candidates(
    matches: list[dict[str, Any]],
    *,
    limit: int,
) -> list[PersistableCandidate]:
    selected: list[PersistableCandidate] = []
    for index, match in enumerate(matches, start=1):
        title = _as_non_empty_string(match.get("title"))
        product_url = _extract_product_url(match)
        if not title or not product_url:
            continue

        price_amount, currency_code = _extract_price(match)
        selected.append(
            PersistableCandidate(
                result_position=index,
                title=title,
                product_url=product_url,
                merchant_name=_as_non_empty_string(
                    match.get("source") or match.get("merchant_name") or match.get("merchant")
                ),
                product_image_url=_extract_image_url(match),
                thumbnail_url=_as_non_empty_string(match.get("thumbnail")),
                current_price_amount=price_amount,
                currency_code=currency_code,
                in_stock=_extract_in_stock(match),
            )
        )
        if len(selected) >= limit:
            break
    return selected


async def list_candidates(search_id: UUID, limit: int = 3) -> list[dict[str, Any]]:
    pool = await ensure_pool()
    rows = await product_searches_repo.list_product_candidates(
        pool,
        initial_search_id=search_id,
        limit=limit,
    )
    return [_record_to_candidate(row) for row in rows]


def _record_to_candidate(row: Any) -> dict[str, Any]:
    return {
        "id": row["id"],
        "user_id": row["user_id"],
        "initial_search_id": row["initial_search_id"],
        "result_position": row["result_position"],
        "title": row["title"],
        "merchant_name": row["merchant_name"],
        "product_url": row["product_url"],
        "product_image_url": row["product_image_url"],
        "thumbnail_url": row["thumbnail_url"],
        "current_price_amount": row["current_price_amount"],
        "currency_code": row["currency_code"],
        "in_stock": row["in_stock"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def _extract_product_url(match: dict[str, Any]) -> str | None:
    for key in ("link", "product_link"):
        value = _as_non_empty_string(match.get(key))
        if value:
            return value
    return None


def _extract_image_url(match: dict[str, Any]) -> str | None:
    for key in ("image", "image_url", "original_image", "product_image"):
        value = _as_non_empty_string(match.get(key))
        if value:
            return value
    return None


def _extract_in_stock(match: dict[str, Any]) -> bool | None:
    value = match.get("in_stock")
    if isinstance(value, bool):
        return value

    availability = _as_non_empty_string(match.get("availability"))
    if not availability:
        return None

    lowered = availability.lower()
    if "out of stock" in lowered:
        return False
    if "in stock" in lowered:
        return True
    return None


def _extract_price(match: dict[str, Any]) -> tuple[Decimal | None, str | None]:
    extracted_price = match.get("extracted_price")
    if isinstance(extracted_price, (int, float)) and not isinstance(extracted_price, bool):
        amount = Decimal(str(extracted_price))
        return amount, _extract_currency_code(match)

    price_text = _as_non_empty_string(match.get("price"))
    if not price_text:
        return None, None

    number_match = re.search(r"(\d+(?:[.,]\d+)?)", price_text)
    if not number_match:
        return None, _extract_currency_code(match, price_text)

    raw_number = number_match.group(1).replace(",", ".")
    try:
        amount = Decimal(raw_number)
    except InvalidOperation:
        return None, _extract_currency_code(match, price_text)
    return amount, _extract_currency_code(match, price_text)


def _extract_currency_code(match: dict[str, Any], price_text: str | None = None) -> str | None:
    for key in ("currency", "currency_code"):
        value = _as_non_empty_string(match.get(key))
        if value and len(value) == 3:
            return value.upper()

    text = price_text or _as_non_empty_string(match.get("price"))
    if not text:
        return None

    for symbol, code in _CURRENCY_SYMBOLS.items():
        if symbol in text:
            return code

    upper_text = text.upper()
    for code in ("USD", "EUR", "GBP"):
        if code in upper_text:
            return code
    return None


def _as_non_empty_string(value: Any) -> str | None:
    if isinstance(value, str):
        stripped = value.strip()
        if stripped:
            return stripped
    return None


def _get_search_id(data: dict[str, Any]) -> str | None:
    metadata = data.get("search_metadata")
    if isinstance(metadata, dict):
        value = metadata.get("id")
        if isinstance(value, str):
            return value
    return None


def _get_google_lens_url(data: dict[str, Any]) -> str | None:
    for key in ("search_url", "google_lens_url"):
        value = data.get(key)
        if isinstance(value, str):
            return value

    metadata = data.get("search_metadata")
    if isinstance(metadata, dict):
        for key in ("google_lens_url", "search_url"):
            value = metadata.get(key)
            if isinstance(value, str):
                return value
    return None


def _get_status(data: dict[str, Any]) -> str:
    metadata = data.get("search_metadata")
    if isinstance(metadata, dict):
        value = metadata.get("status")
        if isinstance(value, str) and value:
            return value
    return "success"
