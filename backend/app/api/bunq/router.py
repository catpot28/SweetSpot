"""HTTP routes wrapping BUNQ. Each handler delegates to services/bunq/operations.py."""
from __future__ import annotations

from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.deps import get_bunq_client
from app.services.bunq import operations as ops
from app.services.bunq.client import BunqApiError, BunqClient

router = APIRouter(prefix="/bunq", tags=["bunq"])

ClientDep = Annotated[BunqClient, Depends(get_bunq_client)]


def _check_user(client: BunqClient, user_id: int) -> None:
    if client.state.user_id != user_id:
        raise HTTPException(status_code=404, detail=f"unknown user {user_id}")


class DraftPaymentBody(BaseModel):
    amount_eur: str
    counterparty_email: str
    description: str
    category: Literal["fixed", "variable", "other"] = "other"


class DraftPaymentResponse(BaseModel):
    draft_id: int


@router.get("/users/{user_id}")
async def get_user(user_id: int, client: ClientDep) -> dict[str, Any]:
    _check_user(client, user_id)
    return await ops.get_user(client)


@router.get("/balance/{user_id}")
async def get_balance(user_id: int, client: ClientDep) -> dict[str, str]:
    _check_user(client, user_id)
    return await ops.get_balance(client)


@router.get("/transactions/{user_id}")
async def get_transactions(
    user_id: int, client: ClientDep, count: int = 50
) -> list[dict[str, Any]]:
    _check_user(client, user_id)
    return await ops.list_transactions(client, count=count)


@router.post("/payments/draft", response_model=DraftPaymentResponse)
async def create_draft_payment(
    body: DraftPaymentBody, client: ClientDep
) -> DraftPaymentResponse:
    draft_id = await ops.create_draft_payment(
        client,
        amount_eur=body.amount_eur,
        counterparty_email=body.counterparty_email,
        description=f"{body.description} #{body.category}",
    )
    return DraftPaymentResponse(draft_id=draft_id)


@router.post("/payments/{draft_id}/confirm", status_code=204)
async def confirm_draft_payment(draft_id: int, client: ClientDep) -> None:
    await ops.confirm_draft_payment(client, draft_id)


# Surface upstream BUNQ errors as 502 instead of a generic 500 so it's clear
# when the issue is BUNQ-side vs ours.
def install_error_handlers(app: Any) -> None:
    @app.exception_handler(BunqApiError)
    async def _bunq_error(_request: Any, exc: BunqApiError) -> Any:
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=502,
            content={
                "error": "bunq_upstream",
                "method": exc.method,
                "path": exc.path,
                "status": exc.status,
                "body": exc.body,
            },
        )
