from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class CandidateResponse(BaseModel):
    id: UUID
    user_id: UUID | None
    initial_search_id: UUID
    result_position: int
    title: str
    merchant_name: str | None
    product_url: str
    product_image_url: str | None
    thumbnail_url: str | None
    current_price_amount: Decimal | None
    currency_code: str | None
    in_stock: bool | None
    created_at: datetime
    updated_at: datetime
