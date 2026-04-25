"""Inbound webhooks from third parties."""
from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter

router = APIRouter(prefix="/webhooks", tags=["webhooks"])
log = logging.getLogger(__name__)


@router.post("/bunq")
async def bunq_webhook(payload: dict[str, Any]) -> dict[str, str]:
    """
    Receives BUNQ notification-filter-url callbacks. Once a user registers
    this URL via `register_notification_webhook`, BUNQ POSTs every account
    mutation here in near-real-time.

    Currently logs the payload and acks 200. Once `services/sweetspot` lands,
    we'll re-score the affected user's wishlist on each callback and notify
    via Telegram if anything crosses the threshold.

    TODO: verify the request signature against the server pubkey stored at
    installation time. Right now any POST is accepted — fine for sandbox,
    not for production.
    """
    log.info("bunq webhook payload keys=%s", list(payload.keys()))
    return {"status": "received"}
