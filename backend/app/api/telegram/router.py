import logging
import httpx
from fastapi import APIRouter, Request
from app.core.config import settings
from app.services.imgbb import upload

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

    async with httpx.AsyncClient(timeout=15) as client:
        # Get file path from Telegram
        res = await client.get(
            f"https://api.telegram.org/bot{settings.telegram_bot_token}/getFile",
            params={"file_id": file_id},
        )
        res.raise_for_status()
        file_path = res.json()["result"]["file_path"]

        # Download the image bytes
        img_res = await client.get(
            f"https://api.telegram.org/file/bot{settings.telegram_bot_token}/{file_path}"
        )
        img_res.raise_for_status()
        image_bytes = img_res.content

    # Upload to ImgBB
    image_url = await upload(image_bytes)

    # Reply to user
    async with httpx.AsyncClient() as client:
        await client.post(
            f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage",
            json={"chat_id": chat_id, "text": f"Image saved to ImgBB:\n{image_url}"},
        )

    return {"ok": True}
