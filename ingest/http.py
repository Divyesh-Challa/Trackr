from __future__ import annotations

import asyncio
import logging
from urllib.parse import urlsplit

import httpx

log = logging.getLogger(__name__)

USER_AGENT = "TrackrJobsBot/1.0 (+https://github.com/Divyesh-Challa/trackr; public job postings only)"


# Hosts that rate-limit aggressively: (max concurrent requests, seconds between requests).
HOST_PACING = {
    "apply.workable.com": (1, 1.5),
    "api.smartrecruiters.com": (2, 0.3),
}


class NotFound(Exception):
    pass


class PoliteClient:
    """httpx client with a per-host concurrency cap and retry on 429/5xx."""

    def __init__(self, per_host: int = 4, timeout: float = 25.0):
        self._client = httpx.AsyncClient(
            headers={"User-Agent": USER_AGENT, "Accept": "application/json, text/plain, */*"},
            timeout=timeout,
            follow_redirects=True,
        )
        self._per_host = per_host
        self._limits: dict[str, asyncio.Semaphore] = {}

    def _limit(self, host: str) -> asyncio.Semaphore:
        if host not in self._limits:
            self._limits[host] = asyncio.Semaphore(HOST_PACING.get(host, (self._per_host, 0))[0])
        return self._limits[host]

    async def __aenter__(self) -> "PoliteClient":
        return self

    async def __aexit__(self, *exc) -> None:
        await self._client.aclose()

    async def get(self, url: str, **kwargs) -> httpx.Response:
        host = urlsplit(url).netloc
        spacing = HOST_PACING.get(host, (0, 0.0))[1]
        async with self._limit(host):
            for attempt in range(4):
                try:
                    resp = await self._client.get(url, **kwargs)
                except httpx.TransportError:
                    if attempt == 3:
                        raise
                    await asyncio.sleep(2 ** attempt)
                    continue
                if resp.status_code in (404, 410):
                    raise NotFound(url)
                if resp.status_code == 429 or resp.status_code >= 500:
                    if attempt == 3:
                        resp.raise_for_status()
                    retry_after = resp.headers.get("retry-after", "")
                    await asyncio.sleep(min(float(retry_after), 60) if retry_after.isdigit() else 5 * 2 ** attempt)
                    continue
                resp.raise_for_status()
                if spacing:
                    await asyncio.sleep(spacing)
                return resp
        raise RuntimeError("unreachable")

    async def resolve(self, url: str) -> str:
        """Final URL after redirects (for link shorteners). Returns the input on failure."""
        host = urlsplit(url).netloc
        async with self._limit(host):
            try:
                resp = await self._client.head(url)
                if resp.status_code >= 400:
                    resp = await self._client.get(url)
                return str(resp.url)
            except httpx.HTTPError:
                return url

    async def get_json(self, url: str, **kwargs):
        return (await self.get(url, **kwargs)).json()

    async def get_text(self, url: str, **kwargs) -> str:
        return (await self.get(url, **kwargs)).text
