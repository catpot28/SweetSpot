from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Query

from app.api.lens.models import CandidateResponse
from app.services.serpapi import list_candidates

router = APIRouter(prefix="/lens", tags=["lens"])


@router.get("/searches/{search_id}/candidates", response_model=list[CandidateResponse])
async def get_candidates(
    search_id: UUID,
    limit: int = Query(default=3, ge=1, le=3),
) -> list[CandidateResponse]:
    candidates = await list_candidates(search_id, limit=limit)
    return [CandidateResponse(**candidate) for candidate in candidates]
