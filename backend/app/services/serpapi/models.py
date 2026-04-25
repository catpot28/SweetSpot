from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Any
from uuid import UUID


@dataclass(slots=True)
class ProductSearchResult:
    search_image_id: UUID
    product_search_id: UUID
    matches: list[dict[str, Any]]
    product_candidate_id: UUID | None
    wishlist_item_id: UUID | None


@dataclass(slots=True)
class PersistableCandidate:
    result_position: int
    title: str
    product_url: str
    merchant_name: str | None
    product_image_url: str | None
    thumbnail_url: str | None
    current_price_amount: Decimal | None
    currency_code: str | None
    in_stock: bool | None
