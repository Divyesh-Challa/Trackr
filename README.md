# Trackr

> Canadian tech internships and co-ops in one feed, and a tracker for every application.
> **Live:** [trackr-vercel-app.vercel.app](https://trackr-vercel-app.vercel.app)

[![CI](https://github.com/Divyesh-Challa/Trackr/actions/workflows/ci.yml/badge.svg)](https://github.com/Divyesh-Challa/Trackr/actions/workflows/ci.yml)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth-3ECF8E?logo=supabase)](https://supabase.com/)

## Why

Applying to dozens of co-ops a term means juggling a spreadsheet, stale job lists and
missed follow-ups. Trackr pulls open Canadian roles from company job boards every 6 hours,
and lets you track each application from wishlist to offer.

## Features

- **Jobs feed** (`/discover`): internships and co-ops across Canada, from public company
  job boards (Greenhouse, Lever, Ashby, Workable, SmartRecruiters, Recruitee) and community
  lists. It includes the startups and mid-size companies big job sites miss. You can
  search and filter by term, province, remote, field and company size. Pay is shown only
  when the posting states it. Roles drop off when they close or their term starts.
- **Tracker** (`/board`):
  - Drag-and-drop board (mouse, touch and keyboard), plus list and insights views.
  - Deadlines and follow-up reminders, tasks, contacts and notes.
  - Add an application by pasting a posting link.
  - CSV import and export.
- **Pro** ($15 CAD/month or $144/year): unlimited applications, plus AI tools on Claude.
  The tools tailor your resume, draft a cover letter, and run interview practice with STAR
  feedback. They only rewrite and select from your own bullets. Every line cites its
  source, and invented numbers are caught on the server.
- **Your data:** row-level security on every table, data export, account deletion, and a
  PIPEDA-oriented [privacy policy](https://trackr-vercel-app.vercel.app/privacy).

## Stack

| Layer | Tech |
|---|---|
| App | Next.js 15 (App Router), React 19, Tailwind, TanStack Query, dnd-kit, framer-motion + GSAP |
| Data & auth | Supabase (Postgres, RLS, Auth); migrations in `supabase/migrations`, pgTAP tests in `supabase/tests` |
| Jobs pipeline | Python (`ingest/`), every 6 hours in GitHub Actions, as a restricted `trackr_ingest` DB role |
| Billing & AI | Stripe Checkout + customer portal; Anthropic API (Claude Sonnet 5.5) with quotas in Postgres |
| Ops | Vercel, Sentry, nightly encrypted `pg_dump` backups, CI with Playwright end-to-end tests |

## Run it locally

Prerequisites: Node 20+, Python 3.12, Docker, and the [Supabase CLI](https://supabase.com/docs/guides/local-development).

```bash
make db-start        # local Postgres + Auth; applies migrations, prints keys
make db-test         # database tests (RLS isolation, ingestion, billing, AI quotas)

cp frontend/.env.example frontend/.env.local   # set the publishable key printed above
cd frontend && npm install && npm run dev      # http://localhost:3000

make ingest          # fill the local feed from live sources (~1–2 min)
```

Sign in with a magic link. Local emails go to Mailpit at http://127.0.0.1:54324.

Other checks: `npm run typecheck`, `npm run lint`, `npm test`, `npm run e2e` (in `frontend/`), and `make ingest-test`.

### Where jobs come from

- **Community lists:** [SimplifyJobs/Summer2027-Internships](https://github.com/SimplifyJobs/Summer2027-Internships) (including off-season terms), [negarprh/Canadian-Tech-Internships-2027](https://github.com/negarprh/Canadian-Tech-Internships-2027) and [Bobwillrule/Canadian-Internship-List](https://github.com/Bobwillrule/Canadian-Internship-List).
- **Company job boards:** every apply link in those lists reveals a board, which is then scanned whole. More boards come from `ingest/boards.yaml`, which `make discover` builds from `ingest/seeds.yaml` and YC companies in Canada. A weekly workflow opens a PR when it finds new boards.

### Optional services

- **Stripe:** put `STRIPE_SECRET_KEY` in `frontend/.env.local` and run `node frontend/scripts/stripe-setup.mjs`. It creates the product, prices, portal and webhook.
- **AI:** set `ANTHROPIC_API_KEY`. `AI_DAILY_BUDGET_USD` caps total daily spend (default $5).
- **Sentry:** set `NEXT_PUBLIC_SENTRY_DSN`.

Each one stays off, with a clear message in the UI, until its key is set.

## Project structure

```
frontend/          Next.js app (src/app routes, src/components, src/lib, e2e/)
ingest/            Python jobs pipeline, board discovery, tests
supabase/          migrations, pgTAP tests, local config
scripts/           one-time secret and role-password setup
.github/workflows  CI, ingest (6-hourly), backups (nightly), board discovery (weekly)
```

## Contact

Divyesh Challa · divyeshchallavgr@gmail.com
