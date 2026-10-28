.PHONY: db-start db-stop db-reset db-test db-types dev build ingest ingest-test ingest-dry discover

# Local Supabase stack (Postgres, Auth, REST). Requires Docker and the Supabase CLI.
db-start:
	supabase start -x studio,imgproxy,edge-runtime,logflare,vector,supavisor

db-stop:
	supabase stop

# Re-create the local database from supabase/migrations.
db-reset:
	supabase db reset

# pgTAP tests in supabase/tests (RLS isolation, status history).
db-test:
	supabase test db

# Regenerate TypeScript types after changing a migration.
db-types:
	supabase gen types typescript --local > frontend/src/lib/supabase/database.types.ts

dev:
	cd frontend && npm run dev

build:
	cd frontend && npm run build

# Job ingestion (Python). Uses the local stack unless SUPABASE_URL is set.
ingest/.venv:
	python3 -m venv ingest/.venv && ingest/.venv/bin/pip install -q -r ingest/requirements.txt

ingest-test: ingest/.venv
	ingest/.venv/bin/python -m pytest ingest/tests -q

ingest-dry: ingest/.venv
	ingest/.venv/bin/python -m ingest --dry-run

# Locally this connects as postgres; production uses the restricted trackr_ingest role.
ingest: ingest/.venv
	INGEST_DATABASE_URL=$${INGEST_DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres} \
	ingest/.venv/bin/python -m ingest

# Re-scan seeds.yaml and Canadian YC companies for job boards; review and commit boards.yaml.
discover: ingest/.venv
	ingest/.venv/bin/python -m ingest.discover
