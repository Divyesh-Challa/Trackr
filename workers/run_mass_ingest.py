#!/usr/bin/env python3
"""
CLI runner for Trackr Mass Job Ingestion Pipeline.
Can be executed locally or inside GitHub Actions cron runner.
"""

import os
import sys
import argparse
import asyncio

# Ensure workers package is importable
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from app.services.job_ingestion_pipeline import run_mass_ingestion


def parse_args():
    parser = argparse.ArgumentParser(description="Trackr Mass Job Ingestion Runner")
    parser.add_argument(
        "--db-url",
        default=os.getenv("DATABASE_URL"),
        help="PostgreSQL connection string (from DATABASE_URL or CLI)"
    )
    parser.add_argument(
        "--gateway-url",
        default=os.getenv("GATEWAY_URL") or "https://trackr-gateway.onrender.com",
        help="Go Gateway base URL for batch API push"
    )
    parser.add_argument(
        "--max-records",
        type=int,
        default=int(os.getenv("MAX_RECORDS", "350")),
        help="Max number of unique jobs to ingest in this cycle"
    )
    return parser.parse_args()


async def main():
    args = parse_args()
    if not args.db_url and not args.gateway_url:
        sys.exit("Error: Either database connection URL (--db-url/DATABASE_URL) or gateway URL (--gateway-url/GATEWAY_URL) must be provided.")

    if args.db_url:
        target_display = "Supabase (Direct SQL)" if "supabase" in (args.db_url or "").lower() else "PostgreSQL (Direct SQL)"
    else:
        target_display = f"Go Gateway Batch API ({args.gateway_url})"

    print("=" * 70)
    print(" TRACKR MASS JOB INGESTION PIPELINE")
    print(f" Target Mode: {target_display}")
    if args.db_url:
        print(f" Target DB: {'Supabase' if 'supabase' in (args.db_url or '').lower() else 'PostgreSQL'}")
    if args.gateway_url:
        print(f" Target Gateway: {args.gateway_url}")
    print(f" Ingestion Cap: {args.max_records} roles")
    print("=" * 70)

    stats = await run_mass_ingestion(
        db_url=args.db_url,
        gateway_url=args.gateway_url,
        max_records=args.max_records
    )

    print("\n" + "=" * 70)
    print(" INGESTION RUN COMPLETE")
    print(f" Total Raw Listings Collected:  {stats.get('total_fetched', 0)}")
    print(f" Verified Active Roles:         {stats.get('unique_verified', stats.get('unique_ingested', 0))}")
    print(f" Database Records Upserted:    {stats.get('db_upserted', 0)}")
    if stats.get('gateway_upserted', 0) > 0:
        print(f" Gateway Records Pushed:       {stats.get('gateway_upserted', 0)}")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(main())
