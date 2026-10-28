.PHONY: db-start db-stop db-reset db-test db-types dev build

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
