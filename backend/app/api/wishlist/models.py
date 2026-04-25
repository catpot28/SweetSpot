from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class AddWishlistItemBody(BaseModel):
    product_candidate_id: UUID
    note: str | None = None
    on_discount: bool | None = None
    sweet_spot: bool | None = None
    reasoning: str | None = None


class AddWishlistItemResponse(BaseModel):
    wishlist_item_id: UUID
    product_candidate_id: UUID


class WishlistCandidateResponse(BaseModel):
    id: UUID
    user_id: UUID | None
    initial_search_id: UUID
    result_position: int
    title: str
    merchant_name: str | None
    product_url: str
    product_image_url: str | None
    thumbnail_url: str | None
    current_price_text: str | None
    current_price_amount: Decimal | None
    currency_code: str | None
    stock_status: str | None
    in_stock: bool | None
    created_at: datetime
    updated_at: datetime


class WishlistItemResponse(BaseModel):
    wishlist_item_id: UUID
    wishlist_user_id: UUID | None
    product_candidate_id: UUID
    note: str | None
    on_discount: bool | None
    sweet_spot: bool | None
    reasoning: str | None
    added_at: datetime
    purchased_at: datetime | None = None
    candidate: WishlistCandidateResponse
