from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel


class AddWishlistItemBody(BaseModel):
    product_candidate_id: UUID
    note: str | None = None


class AddWishlistItemResponse(BaseModel):
    wishlist_item_id: UUID
    product_candidate_id: UUID
