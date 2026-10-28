"""Run one ingestion pass: `python -m ingest [--dry-run]`."""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import sys
from collections import Counter
from datetime import date
from urllib.parse import urlsplit

from .classify import is_student_role
from .locations import parse_locations
from .boards import boards_from_postings, company_key, known_sizes, load_boards, merge_boards, size_from_openings
from .http import NotFound, PoliteClient
from .models import Board, RawPosting
from .pipeline import normalize, to_record
from .sources.ats import FETCHERS, smartrecruiters_detail
from .sources.lists import LISTS, fetch_list

log = logging.getLogger("ingest")

SHORTENERS = {"go.vansh.nyc", "bit.ly", "tinyurl.com", "t.co", "lnkd.in", "rb.gy"}


async def collect(known_postings: list[dict], max_boards: int | None) -> tuple[list[RawPosting], dict]:
    stats: dict = {"lists": {}, "boards": {"ok": 0, "failed": 0, "not_found": 0}, "errors": []}
    postings: list[RawPosting] = []
    failed_companies: set[str] = set()
    ok_sources: set[str] = set()

    async with PoliteClient() as client:
        results = await asyncio.gather(*(fetch_list(client, src) for src in LISTS), return_exceptions=True)
        for src, result in zip(LISTS, results):
            if isinstance(result, Exception):
                stats["lists"][src.name] = {"error": repr(result)[:300]}
                stats["errors"].append(f"{src.name}: {result!r}"[:300])
                continue
            ok_sources.add(src.name)
            stats["lists"][src.name] = {"fetched": len(result)}
            postings += result

        # Some lists hide employer links behind a shortener; resolve the ones we'd keep so
        # they dedupe against the real posting and reveal the company's board.
        shortened = [p for p in postings if urlsplit(p.job_url).netloc in SHORTENERS
                     and p.active and is_student_role(p.title) and parse_locations(p.locations)]
        resolved = await asyncio.gather(*(client.resolve(p.job_url) for p in shortened))
        for p, url in zip(shortened, resolved):
            p.job_url = url
        stats["resolved_short_links"] = len(shortened)

        known = [RawPosting(source="", source_id=None, company_name=r["company_name"], title="",
                            job_url=r["job_url"], locations=[], company_size=r.get("company_size"))
                 for r in known_postings]
        boards = merge_boards(load_boards(), boards_from_postings(postings), boards_from_postings(known))
        if max_boards:
            boards = boards[:max_boards]
        stats["boards"]["total"] = len(boards)

        async def run_board(board: Board):
            try:
                return board, await FETCHERS[board.ats](client, board), None
            except Exception as exc:  # one bad board must not sink the run
                return board, [], exc

        by_ats: Counter = Counter()
        for board, found, exc in await asyncio.gather(*(run_board(b) for b in boards)):
            if isinstance(exc, NotFound):
                stats["boards"]["not_found"] += 1
            elif exc:
                stats["boards"]["failed"] += 1
                failed_companies.add(board.company)
                stats["errors"].append(f"{board.ats}/{board.slug}: {exc!r}"[:300])
            else:
                if board.size is None:
                    size = size_from_openings(board, len(found))
                    for p in found:
                        p.company_size = size
                stats["boards"]["ok"] += 1
                ok_sources.add(board.ats)
                by_ats[board.ats] += len(found)
                postings += found
        stats["boards"]["postings_by_ats"] = dict(by_ats)

        # SmartRecruiters lists omit descriptions; fetch them only for postings we'd keep.
        needs_detail = [p for p in postings if p.detail_ref and to_record(p, date.today())]
        await asyncio.gather(*(smartrecruiters_detail(client, p) for p in needs_detail), return_exceptions=True)

    # A known size (curated, YC headcount, or the large-employer list) beats any estimate,
    # and applies to list-sourced postings for that company too.
    sizes = known_sizes()
    for p in postings:
        p.company_size = sizes.get(company_key(p.company_name), p.company_size)

    stats["ok_sources"] = sorted(ok_sources)
    stats["failed_companies"] = sorted(failed_companies)
    return postings, stats


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m ingest")
    parser.add_argument("--dry-run", action="store_true", help="fetch and normalize, but don't write")
    parser.add_argument("--max-boards", type=int, help="cap the number of boards scanned (for testing)")
    parser.add_argument("--dump", help="write normalized records to this JSON file")
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    logging.getLogger("httpx").setLevel(logging.WARNING)

    store = None
    known: list[dict] = []
    if not args.dry_run:
        from .store import Store
        store = Store()
        run_id, run_started = store.start_run()
        known = store.active_ats_postings()

    try:
        postings, stats = asyncio.run(collect(known, args.max_boards))
        result = normalize(postings)
        stats["kept_by_source"] = result.kept_by_source
        stats["kept"] = len(result.records)
        stats["closed_in_lists"] = len(result.closed_keys)
        log.info("kept %d postings: %s", len(result.records), json.dumps(result.kept_by_source))

        if args.dump:
            with open(args.dump, "w") as f:
                json.dump(result.records, f, indent=1, default=str)

        if store is None:
            print(json.dumps(stats, indent=2, default=str))
            return 0

        inserted, updated = store.upsert(result.records)
        deactivated = store.deactivate(sorted(result.closed_keys))
        deactivated += store.mark_missing(run_started, stats["ok_sources"], stats["failed_companies"])
        deactivated += store.expire()
        status = "succeeded" if not stats["errors"] else "partial"
        store.finish_run(run_id, status=status, inserted=inserted, updated=updated,
                         deactivated=deactivated, stats=stats)
        log.info("run %s: +%d new, %d updated, %d deactivated", status, inserted, updated, deactivated)
        return 0
    except Exception as exc:
        if store is not None:
            store.finish_run(run_id, status="failed", stats={"fatal": repr(exc)[:1000]})
        raise


if __name__ == "__main__":
    sys.exit(main())
