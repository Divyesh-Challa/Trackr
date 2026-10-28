"""Writes to Supabase through PostgREST with the service-role key (bypasses RLS)."""

from __future__ import annotations

import json
import os
from datetime import datetime

import httpx

from .models import ATS_SOURCES

BATCH = 250


class Store:
    def __init__(self, url: str | None = None, key: str | None = None):
        url = url or os.environ["SUPABASE_URL"]
        key = key or os.environ["SUPABASE_SERVICE_ROLE_KEY"]
        self._http = httpx.Client(
            base_url=f"{url.rstrip('/')}/rest/v1",
            headers={"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            timeout=60,
        )

    def _rpc(self, fn: str, args: dict):
        resp = self._http.post(f"/rpc/{fn}", content=json.dumps(args, default=str))
        if resp.status_code >= 400:
            raise RuntimeError(f"{fn} failed ({resp.status_code}): {resp.text[:500]}")
        return resp.json()

    def start_run(self) -> tuple[str, datetime]:
        resp = self._http.post("/ingest_runs", json={}, headers={"Prefer": "return=representation"})
        resp.raise_for_status()
        row = resp.json()[0]
        return row["id"], datetime.fromisoformat(row["started_at"])

    def finish_run(self, run_id: str, **fields) -> None:
        fields["finished_at"] = datetime.now().astimezone().isoformat()
        resp = self._http.patch(f"/ingest_runs?id=eq.{run_id}", content=json.dumps(fields, default=str))
        resp.raise_for_status()

    def active_ats_postings(self) -> list[dict]:
        """Active ATS-sourced rows, so their boards keep being scanned even if no list links them."""
        rows, offset = [], 0
        sources = ",".join(sorted(ATS_SOURCES))
        while True:
            resp = self._http.get(
                "/jobs",
                params={"select": "job_url,company_name,company_size", "is_active": "eq.true",
                        "source": f"in.({sources})", "limit": 1000, "offset": offset},
            )
            resp.raise_for_status()
            page = resp.json()
            rows += page
            if len(page) < 1000:
                return rows
            offset += 1000

    def upsert(self, records: list[dict]) -> tuple[int, int]:
        inserted = updated = 0
        for i in range(0, len(records), BATCH):
            result = self._rpc("ingest_upsert_jobs", {"p_jobs": records[i:i + BATCH]})[0]
            inserted += result["inserted"]
            updated += result["updated"]
        return inserted, updated

    def mark_missing(self, run_started: datetime, sources: list[str], skip_companies: list[str]) -> int:
        return self._rpc("ingest_mark_missing", {
            "p_run_started": run_started.isoformat(),
            "p_sources": sources,
            "p_skip_companies": skip_companies,
        })

    def deactivate(self, keys: list[str]) -> int:
        total = 0
        for i in range(0, len(keys), 500):
            total += self._rpc("ingest_deactivate", {"p_canonical": keys[i:i + 500]})
        return total

    def expire(self) -> int:
        return self._rpc("ingest_expire", {})
