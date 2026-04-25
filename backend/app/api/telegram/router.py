import logging
import httpx
from fastapi import APIRouter, Request
from app.core.config import settings
from app.services.imgbb import upload
from app.services.serpapi import search_products

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
        log.info("Persisted product search %s", result.product_search_id)
        reply = _format_matches(result.matches)
    except Exception as e:
        log.exception("Failed to process photo")
        reply = f"❌ Something went wrong: {e}"

    await send_message(chat_id, reply)
    return {"ok": True}


async def send_message(chat_id: int, text: str) -> None:
    async with httpx.AsyncClient() as client:
        await client.post(
            f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage",
            json={"chat_id": chat_id, "text": text, "disable_web_page_preview": True},
        )


def _format_matches(matches: list[dict]) -> str:
    if not matches:
        return "🔍 No products found for this image."

    lines = ["🔍 Top 3 matches:\n"]
    for i, m in enumerate(matches, 1):
        title   = m.get("title") or "Unknown product"
        price   = m.get("price") or "Price unavailable"
        rating  = m.get("rating")
        reviews = m.get("reviews")
        link    = m.get("link") or m.get("product_link") or ""

        rating_str = f"⭐ {rating}" + (f" ({reviews} reviews)" if reviews else "") if rating else ""

        lines.append(
            f"{i}. {title}\n"
            f"   💰 {price}\n"
            + (f"   {rating_str}\n" if rating_str else "")
            + (f"   🔗 {link}" if link else "")
        )

    return "\n\n".join(lines)
