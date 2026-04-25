import logging
import re
from decimal import Decimal
from typing import Any
from uuid import UUID

import httpx
from fastapi import APIRouter, Request

from app.core.config import settings
from app.services.imgbb import upload
from app.services.serpapi import search_products
from app.services.wishlist import add_candidate_to_wishlist

router = APIRouter(prefix="/telegram", tags=["telegram"])
log = logging.getLogger(__name__)


@router.get("/status")
async def status():
    """Check what webhook URL Telegram currently has registered."""
    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"https://api.telegram.org/bot{settings.telegram_bot_token}/getWebhookInfo"
        )
    return res.json()


@router.post("/webhook")
async def webhook(request: Request):
    update = await request.json()
    log.info("Webhook update received: %s", list(update.keys()))
    message = update.get("message", {})
    chat_id = message.get("chat", {}).get("id")
    photos = message.get("photo")

    log.info("chat_id=%s has_photo=%s", chat_id, bool(photos))

    if not chat_id or not photos:
        return {"ok": True}

    file_id = photos[-1]["file_id"]

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.get(
                f"https://api.telegram.org/bot{settings.telegram_bot_token}/getFile",
                params={"file_id": file_id},
            )
            res.raise_for_status()
            file_path = res.json()["result"]["file_path"]

            img_res = await client.get(
                f"https://api.telegram.org/file/bot{settings.telegram_bot_token}/{file_path}"
            )
            img_res.raise_for_status()
            image_bytes = img_res.content

        image_url = await upload(image_bytes)
        log.info("ImgBB upload success: %s", image_url)

        await send_message(chat_id, "✅ Image saved! Searching for similar products...")

        result = await search_products(image_url)
        log.info("Persisted product search %s with %d candidates", result.product_search_id, len(result.candidate_ids))

        # Pick the cheapest candidate and add it to the wishlist automatically.
        cheapest_id, cheapest_match = _pick_cheapest(result.candidate_ids, result.matches)
        wishlist_item_id = await add_candidate_to_wishlist(cheapest_id)
        log.info("Added candidate %s to wishlist as item %s", cheapest_id, wishlist_item_id)

        reply = _format_added(cheapest_match, result.matches)
    except Exception as e:
        log.exception("Failed to process photo")
        reply = f"❌ Something went wrong: {e}"

    await send_message(chat_id, reply)
    return {"ok": True}


def _pick_cheapest(
    candidate_ids: list[UUID],
    matches: list[dict[str, Any]],
) -> tuple[UUID, dict[str, Any]]:
    """Return the (candidate_id, match) pair with the lowest extracted price.

    Falls back to the first candidate when no prices are available.
    """
    best_id = candidate_ids[0]
    best_match = matches[0]
    best_price: Decimal | None = None

    for cid, match in zip(candidate_ids, matches):
        price = _parse_price(match)
        if price is not None and (best_price is None or price < best_price):
            best_price = price
            best_id = cid
            best_match = match

    return best_id, best_match


def _parse_price(match: dict[str, Any]) -> Decimal | None:
    extracted = match.get("extracted_price")
    if isinstance(extracted, (int, float)) and not isinstance(extracted, bool) and extracted > 0:
        return Decimal(str(extracted))
    raw = match.get("price")
    if isinstance(raw, dict):
        raw = raw.get("value") or raw.get("extracted_value")
    if raw:
        m = re.search(r"\d+(?:[.,]\d+)?", str(raw).replace(",", "."))
        if m:
            try:
                return Decimal(m.group())
            except Exception:
                pass
    return None


def _format_added(added: dict[str, Any], all_matches: list[dict[str, Any]]) -> str:
    title = added.get("title") or "Unknown product"
    price_raw = added.get("price") or "Price unavailable"
    price = price_raw.get("value") if isinstance(price_raw, dict) else str(price_raw)

    lines = [f"✅ Added to wishlist:\n{title}\n💰 {price}\n"]

    other = [m for m in all_matches if m is not added]
    if other:
        lines.append("🔍 Other matches found:")
        for m in other:
            t = m.get("title") or "Unknown"
            p_raw = m.get("price") or ""
            p = p_raw.get("value") if isinstance(p_raw, dict) else str(p_raw)
            link = m.get("link") or m.get("product_link") or ""
            entry = f"• {t}  💰 {p}"
            if link:
                entry += f"\n  🔗 {link}"
            lines.append(entry)

    return "\n\n".join(lines)


async def send_message(chat_id: int, text: str) -> None:
    async with httpx.AsyncClient() as client:
        await client.post(
            f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage",
            json={"chat_id": chat_id, "text": text, "disable_web_page_preview": True},
        )
