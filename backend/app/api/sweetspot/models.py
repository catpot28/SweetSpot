from __future__ import annotations

from pydantic import BaseModel


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
