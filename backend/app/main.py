"""SweetSpot FastAPI app entry point."""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.bunq.router import install_error_handlers, router as bunq_router

app = FastAPI(title="SweetSpot API", version="0.1.0")

# Wide-open CORS for hackathon dev (Vite on a different port). Tighten before prod.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(bunq_router)
install_error_handlers(app)


@app.get("/health", tags=["meta"])
async def health() -> dict[str, str]:
    return {"status": "ok"}
