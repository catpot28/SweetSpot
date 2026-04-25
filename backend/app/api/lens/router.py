from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from pydantic import BaseModel

from app.api.lens.models import CandidateResponse
from app.services.imgbb import upload as imgbb_upload
from app.services.serpapi import list_candidates, search_products

router = APIRouter(prefix="/lens", tags=["lens"])
log = logging.getLogger(__name__)


class ScanResponse(BaseModel):
    search_id: UUID
    image_url: str
    candidate_ids: list[UUID]


@router.post("/scan", response_model=ScanResponse)
async def scan(file: UploadFile = File(...)) -> ScanResponse:
    """
    Accept a captured photo, upload it to ImgBB, run SerpApi Google Lens with
    persistence (creates `product_candidates` rows so they're addressable from
    POST /wishlist), and return the search_id + candidate UUIDs.
    """
    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="empty file")
    try:
        image_url = await imgbb_upload(image_bytes)
    except Exception as exc:
        log.exception("ImgBB upload failed")
        raise HTTPException(status_code=502, detail=f"imgbb upload failed: {exc}") from exc
    try:
        result = await search_products(image_url)
    except Exception as exc:
        log.exception("SerpApi search failed")
        raise HTTPException(status_code=502, detail=f"serpapi search failed: {exc}") from exc
    return ScanResponse(
        search_id=result.product_search_id,
        image_url=image_url,
        candidate_ids=result.candidate_ids,
    )


@router.get("/searches/{search_id}/candidates", response_model=list[CandidateResponse])
async def get_candidates(
    search_id: UUID,
    limit: int = Query(default=3, ge=1, le=3),
) -> list[CandidateResponse]:
    candidates = await list_candidates(search_id, limit=limit)
    return [CandidateResponse(**candidate) for candidate in candidates]
