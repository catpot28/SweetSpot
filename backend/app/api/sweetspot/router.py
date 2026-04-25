from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from app.core.deps import get_bunq_client
from app.services.bunq.client import BunqClient
from app.api.sweetspot.models import SearchRequest, SearchResponse
from app.api.sweetspot.service import run_search

router = APIRouter(prefix="/sweetspot", tags=["sweetspot"])
log = logging.getLogger(__name__)

ClientDep = Annotated[BunqClient, Depends(get_bunq_client)]


@router.post("/search", response_model=SearchResponse)
async def search(body: SearchRequest, client: ClientDep) -> SearchResponse:
    log.info("sweetspot/search: image_url=%s", body.image_url)
    try:
        return await run_search(body.image_url, client)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        log.exception("sweetspot/search failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc
