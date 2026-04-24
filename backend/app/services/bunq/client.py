"""
BunqClient — async HTTP client with auto session refresh.

Wraps httpx.AsyncClient with the headers BUNQ requires, signs request bodies
with the user's private key, and transparently re-runs session-server when the
24h session token expires (per BUNQ_INTEGRATION.md build step 2).

Stateless service functions in operations.py call `client.request(...)` and
get back parsed JSON; everything below that — signing, retries, persistence —
is the client's job.
"""
from __future__ import annotations

import json
import uuid
from typing import Any

import httpx

from .signing import sign_body
from .state import BunqState, StateStore

API_BASE = "https://public-api.sandbox.bunq.com"
USER_AGENT = "SweetSpot/0.1"


class BunqApiError(RuntimeError):
    def __init__(self, method: str, path: str, status: int, body: str) -> None:
        super().__init__(f"[{method} {path}] HTTP {status}: {body}")
        self.method = method
        self.path = path
        self.status = status
        self.body = body


class BunqClient:
    def __init__(
        self,
        state: BunqState,
        store: StateStore,
        *,
        base_url: str = API_BASE,
        user_agent: str = USER_AGENT,
    ) -> None:
        self._state = state
        self._store = store
        self._user_agent = user_agent
        self._http = httpx.AsyncClient(base_url=base_url, timeout=30)

    async def __aenter__(self) -> "BunqClient":
        return self

    async def __aexit__(self, *exc: object) -> None:
        await self.aclose()

    async def aclose(self) -> None:
        await self._http.aclose()

    @property
    def state(self) -> BunqState:
        return self._state

    async def request(
        self,
        method: str,
        path: str,
        body: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        response = await self._send(method, path, body, self._state.session_token)
        if response.status_code == 401:
            await self._refresh_session()
            response = await self._send(method, path, body, self._state.session_token)
        if response.status_code >= 400:
            raise BunqApiError(method, path, response.status_code, response.text)
        return response.json()

    async def _send(
        self,
        method: str,
        path: str,
        body: dict[str, Any] | None,
        auth_token: str,
    ) -> httpx.Response:
        headers = self._base_headers()
        headers["X-Bunq-Client-Authentication"] = auth_token

        content: bytes | None = None
        if body is not None:
            content = json.dumps(body).encode()
            headers["Content-Type"] = "application/json"
            headers["X-Bunq-Client-Signature"] = sign_body(self._state.private_key, content)

        return await self._http.request(method, path, content=content, headers=headers)

    async def _refresh_session(self) -> None:
        # Installation + device registration are permanent; only session_token
        # expires (~24h). A fresh session-server call with the api_key is enough.
        body = json.dumps({"secret": self._state.api_key}).encode()
        headers = self._base_headers()
        headers["Content-Type"] = "application/json"
        headers["X-Bunq-Client-Authentication"] = self._state.installation_token
        headers["X-Bunq-Client-Signature"] = sign_body(self._state.private_key, body)

        r = await self._http.post("/v1/session-server", content=body, headers=headers)
        if r.status_code >= 400:
            raise BunqApiError("POST", "/v1/session-server", r.status_code, r.text)

        data = r.json()
        new_token = next(
            item["Token"]["token"] for item in data["Response"] if "Token" in item
        )
        self._state = self._state.with_session(new_token)
        await self._store.save(self._state)

    def _base_headers(self) -> dict[str, str]:
        return {
            "Cache-Control": "no-cache",
            "User-Agent": self._user_agent,
            "X-Bunq-Client-Request-Id": str(uuid.uuid4()),
            "X-Bunq-Geolocation": "0 0 0 0 NL",
            "X-Bunq-Language": "en_US",
            "X-Bunq-Region": "nl_NL",
        }
