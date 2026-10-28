"""Writes to Postgres as the least-privilege `trackr_ingest` role.

That role can only call the ingest_* functions (security definer), so a leaked
INGEST_DATABASE_URL can't read users' data or touch anything else.
"""

from __future__ import annotations

import os
from datetime import datetime

import psycopg
from psycopg.types.json import Jsonb

BATCH = 250


class Store:
    def __init__(self, dsn: str | None = None):
        dsn = dsn or os.environ["INGEST_DATABASE_URL"]
        # Session pooler / direct connection; autocommit so each call is its own transaction.
        self._conn = psycopg.connect(dsn, autocommit=True, prepare_threshold=None, connect_timeout=20)

    def _one(self, sql: str, params: tuple = ()):
        with self._conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.fetchone()

    def start_run(self) -> tuple[str, datetime]:
        run_id, started_at = self._one("select id, started_at from public.ingest_start_run()")
        return str(run_id), started_at

    def finish_run(self, run_id: str, status: str, inserted: int = 0, updated: int = 0,
                   deactivated: int = 0, stats: dict | None = None) -> None:
        self._one(
            "select public.ingest_finish_run(%s, %s, %s, %s, %s, %s)",
            (run_id, status, inserted, updated, deactivated, Jsonb(stats or {})),
        )

    def active_ats_postings(self) -> list[dict]:
        with self._conn.cursor() as cur:
            cur.execute("select job_url, company_name, company_size from public.ingest_active_ats_postings()")
            return [{"job_url": u, "company_name": c, "company_size": s} for u, c, s in cur.fetchall()]

    def upsert(self, records: list[dict]) -> tuple[int, int]:
        inserted = updated = 0
        for i in range(0, len(records), BATCH):
            ins, upd = self._one("select * from public.ingest_upsert_jobs(%s)", (Jsonb(records[i:i + BATCH]),))
            inserted += ins
            updated += upd
        return inserted, updated

    def mark_missing(self, run_started: datetime, sources: list[str], skip_companies: list[str]) -> int:
        return self._one(
            "select public.ingest_mark_missing(%s, %s, %s)", (run_started, sources, skip_companies)
        )[0]

    def deactivate(self, keys: list[str]) -> int:
        total = 0
        for i in range(0, len(keys), 500):
            total += self._one("select public.ingest_deactivate(%s)", (keys[i:i + 500],))[0]
        return total

    def expire(self) -> int:
        return self._one("select public.ingest_expire()")[0]
