"""SweetSpot FastAPI app entry point."""
from __future__ import annotations

import httpx
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.bunq.router import install_error_handlers, router as bunq_router
from app.api.telegram.router import router as telegram_router
from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.telegram_bot_token and settings.railway_public_url:
        webhook_url = f"{settings.railway_public_url.rstrip('/')}/telegram/webhook"
        async with httpx.AsyncClient() as client:
            await client.post(
                f"https://api.telegram.org/bot{settings.telegram_bot_token}/setWebhook",
                json={"url": webhook_url},
            )
    yield


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
    return {"status": "ok"}
