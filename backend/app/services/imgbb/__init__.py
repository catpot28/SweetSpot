import base64
import httpx
from app.core.config import settings


async def upload(image_bytes: bytes) -> str:
    """Upload image bytes to ImgBB, return the public URL."""
    encoded = base64.b64encode(image_bytes).decode()
    async with httpx.AsyncClient(timeout=15) as client:
        res = await client.post(
            "https://api.imgbb.com/1/upload",
            params={"key": settings.imgbb_key},
            data={"image": encoded},
        )
        res.raise_for_status()
        return res.json()["data"]["url"]
