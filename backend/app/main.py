"""SweetSpot FastAPI app entry point."""
from __future__ import annotations

import logging
import httpx
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.bunq.router import install_error_handlers, router as bunq_router
from app.api.telegram.router import router as telegram_router
from app.core.config import settings
from app.db.client import close_pool, init_pool

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("lifespan startup: database_url_set=%s", settings.database_url is not None)
    try:
        await init_pool()
        log.info("DB pool started OK")
    except Exception:
        log.exception("DB pool failed to initialize")

    log.info("token_set=%s  railway_url=%s", bool(settings.telegram_bot_token), settings.railway_public_url)
    try:
        if settings.telegram_bot_token and settings.railway_public_url:
            webhook_url = f"{settings.railway_public_url.rstrip('/')}/telegram/webhook"
            async with httpx.AsyncClient() as client:
                res = await client.post(
                    f"https://api.telegram.org/bot{settings.telegram_bot_token}/setWebhook",
                    json={"url": webhook_url},
                )
            log.info("setWebhook → %s", res.json())
        else:
            log.warning("Webhook NOT registered — set TELEGRAM_BOT_TOKEN and RAILWAY_PUBLIC_URL in Railway vars")
    except Exception:
        log.exception("Webhook registration failed — app will still start")

    yield
    await close_pool()


app = FastAPI(title="SweetSpot API", version="0.1.0", lifespan=lifespan)

# Wide-open CORS for hackathon dev (Vite on a different port). Tighten before prod.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(bunq_router)
app.include_router(telegram_router)
install_error_handlers(app)


@app.get("/health", tags=["meta"])
async def health() -> dict[str, str]:
    from app.db.client import _pool
    return {"status": "ok", "db": "connected" if _pool else "disconnected"}
