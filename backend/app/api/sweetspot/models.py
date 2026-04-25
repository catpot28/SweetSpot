from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel


class SearchRequest(BaseModel):
    image_url: str
    wishlist_item_id: UUID | None = None


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
    reasoning: str | None
    item_price: float
    disposable: float
    score_breakdown: ScoreBreakdown
    financials: FinancialSummary
    matches: list[ProductMatch]


class WishlistItemResult(BaseModel):
    wishlist_item_id: str
    title: str
    sweet_spot: bool
    score: int
    tier: str
    item_price: float | None
    reasoning: str | None
    updated: bool           # False if DB write failed


class WishlistScanResponse(BaseModel):
    items_scanned: int
    sweet_spot_count: int
    financials: FinancialSummary
    results: list[WishlistItemResult]
