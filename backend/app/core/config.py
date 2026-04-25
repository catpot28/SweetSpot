"""Application settings loaded from .env at the repo root."""
from __future__ import annotations

from pathlib import Path

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=REPO_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    bunq_api_base: str = "https://public-api.sandbox.bunq.com"

    # Supabase Postgres connection string (transaction pooler, port 6543).
    database_url: SecretStr | None = None

    telegram_bot_token: str = ""
    imgbb_key: str = ""
    serpapi_key: str = ""
    anthropic_api_key: str = ""
    railway_public_url: str = ""
    # Railway injects this automatically for every deployment.
    railway_static_url: str = ""

    @property
    def webhook_base_url(self) -> str:
        """Return the best available public URL for this deployment."""
        return (
            self.railway_static_url.rstrip("/")
            or self.railway_public_url.rstrip("/")
        )


settings = Settings()
