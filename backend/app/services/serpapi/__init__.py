import logging
import httpx
from app.core.config import settings

log = logging.getLogger(__name__)
_SEARCH_URL = "https://serpapi.com/search"


async def search_products(image_url: str) -> list[dict]:
    """
    Search Google Lens via SerpApi for product matches.
    Returns raw list of visual_matches (full JSON per match).
    """
    params = {
        "engine": "google_lens",
        "url": image_url,
        "hl": "en",
        "country": "nl",
        "search_type": "products",
        "safe": "active",
        "auto_crop": "true",
        "api_key": settings.serpapi_key,
    }

    async with httpx.AsyncClient(timeout=30) as client:
        res = await client.get(_SEARCH_URL, params=params)
        res.raise_for_status()
        data = res.json()

    log.info("SerpApi full response keys: %s", list(data.keys()))

    matches = (
        data.get("visual_matches")
        or data.get("shopping_results")
        or data.get("inline_shopping_results")
        or []
    )

    log.info("SerpApi returned %d matches — top 3: %s", len(matches), [m.get("title") for m in matches[:3]])
    return matches[:3]
