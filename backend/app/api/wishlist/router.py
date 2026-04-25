from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.api.wishlist.models import AddWishlistItemBody, AddWishlistItemResponse
from app.services.wishlist import add_candidate_to_wishlist

router = APIRouter(prefix="/wishlist", tags=["wishlist"])


@router.post("", response_model=AddWishlistItemResponse, status_code=status.HTTP_201_CREATED)
async def create_wishlist_item(body: AddWishlistItemBody) -> AddWishlistItemResponse:
    try:
        wishlist_item_id = await add_candidate_to_wishlist(
            body.product_candidate_id,
            note=body.note,
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return AddWishlistItemResponse(
        wishlist_item_id=wishlist_item_id,
        product_candidate_id=body.product_candidate_id,
    )
