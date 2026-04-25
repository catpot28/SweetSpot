import logging
from decimal import Decimal
from typing import Any
from uuid import UUID

import httpx
from fastapi import APIRouter, Request

from app.core.config import settings
from app.services.imgbb import upload
from app.services.serpapi import list_candidates, search_products
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
        log.info("[TG] search done: search_id=%s candidate_ids=%s", result.product_search_id, result.candidate_ids)

        if not result.candidate_ids:
            await send_message(chat_id, "🔍 No products found for this image.")
            return {"ok": True}

        # Mirror the frontend Candidates flow: fetch DB rows, sort cheapest first.
        log.info("[TG] fetching candidates from DB for search_id=%s", result.product_search_id)
        candidates = await list_candidates(result.product_search_id, limit=10)
        log.info("[TG] got %d candidates: %s", len(candidates), [(c["id"], c.get("title"), c.get("current_price_amount")) for c in candidates])

        if not candidates:
            await send_message(chat_id, "🔍 No products found for this image.")
            return {"ok": True}

        cheapest = _pick_cheapest(candidates)
        log.info("[TG] adding candidate id=%s title=%r price=%s to wishlist", cheapest["id"], cheapest.get("title"), cheapest.get("current_price_amount"))

        wishlist_item_id = await add_candidate_to_wishlist(cheapest["id"])
        log.info("[TG] wishlist item created: wishlist_item_id=%s for candidate_id=%s", wishlist_item_id, cheapest["id"])

        reply = _format_added(cheapest, candidates)
    except Exception as e:
        log.exception("[TG] FAILED to process photo: %s", e)
        reply = f"❌ Something went wrong: {e}"

    await send_message(chat_id, reply)
    return {"ok": True}


def _pick_cheapest(candidates: list[dict[str, Any]]) -> dict[str, Any]:
    """Return the candidate with the lowest current_price_amount.

    Falls back to the first candidate when none have a price.
    """
    priced = [c for c in candidates if c.get("current_price_amount") is not None]
    if not priced:
        return candidates[0]
    return min(priced, key=lambda c: Decimal(str(c["current_price_amount"])))


def _format_added(added: dict[str, Any], all_candidates: list[dict[str, Any]]) -> str:
    title = added.get("title") or "Unknown product"
    merchant = added.get("merchant_name") or ""
    link = added.get("product_url") or ""

    price_line = _price_str(added)

    header = f"✅ Added to wishlist:\n{title}"
    if merchant:
        header += f"\n🏪 {merchant}"
    if price_line:
        header += f"\n💰 {price_line}"
    if link:
        header += f"\n🔗 {link}"

    lines = [header]

    others = [c for c in all_candidates if c["id"] != added["id"]]
    if others:
        lines.append("🔍 Other matches:")
        for c in others:
            t = c.get("title") or "Unknown"
            m = c.get("merchant_name") or ""
            p = _price_str(c)
            u = c.get("product_url") or ""
            entry = f"• {t}" + (f" — {m}" if m else "") + (f"  💰 {p}" if p else "")
            if u:
                entry += f"\n  🔗 {u}"
            lines.append(entry)

    return "\n\n".join(lines)


def _price_str(candidate: dict[str, Any]) -> str:
    text = candidate.get("current_price_text")
    if text:
        return text
    amount = candidate.get("current_price_amount")
    if amount is not None:
        currency = candidate.get("currency_code") or "€"
        symbol = {"EUR": "€", "USD": "$", "GBP": "£"}.get(currency, currency + " ")
        return f"{symbol}{amount}"
    return ""


async def send_message(chat_id: int, text: str) -> None:
    async with httpx.AsyncClient() as client:
        await client.post(
            f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage",
            json={"chat_id": chat_id, "text": text, "disable_web_page_preview": True},
        )
