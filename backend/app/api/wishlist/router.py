from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.api.wishlist.models import (
    AddWishlistItemBody,
    AddWishlistItemResponse,
    WishlistItemResponse,
)
from app.services.wishlist import add_candidate_to_wishlist, list_wishlist_items

router = APIRouter(prefix="/wishlist", tags=["wishlist"])


@router.get("", response_model=list[WishlistItemResponse])
async def get_wishlist_items() -> list[WishlistItemResponse]:
    items = await list_wishlist_items()
    return [WishlistItemResponse(**item) for item in items]


@router.get("/discount", response_model=list[WishlistItemResponse])
async def get_discounted_wishlist_items() -> list[WishlistItemResponse]:
    """Wishlist items currently on discount (sweet_spot OR on_discount)."""
    items = await list_wishlist_items(filter_="discount")
    return [WishlistItemResponse(**item) for item in items]


@router.get("/bought", response_model=list[WishlistItemResponse])
async def get_bought_wishlist_items() -> list[WishlistItemResponse]:
    """Wishlist items that have been purchased (purchased_at set)."""
    items = await list_wishlist_items(filter_="bought")
    return [WishlistItemResponse(**item) for item in items]


@router.post("", response_model=AddWishlistItemResponse, status_code=status.HTTP_201_CREATED)
async def create_wishlist_item(body: AddWishlistItemBody) -> AddWishlistItemResponse:
    try:
        wishlist_item_id = await add_candidate_to_wishlist(
            body.product_candidate_id,
            note=body.note,
            on_discount=body.on_discount,
            sweet_spot=body.sweet_spot,
            reasoning=body.reasoning,
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return AddWishlistItemResponse(
        wishlist_item_id=wishlist_item_id,
        product_candidate_id=body.product_candidate_id,
    )
