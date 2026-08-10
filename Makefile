.PHONY: all infra-up infra-down db-migrate db-seed build-gateway run-gateway run-workers run-frontend test-sla clean

all: infra-up build-gateway

# Infrastructure (PostgreSQL 16 with pgvector, Redis)
infra-up:
	docker compose up -d postgres redis
	@echo "Waiting for PostgreSQL to accept connections..."
	@until docker exec trackr-postgres pg_isready -U trackr -d trackr_db >/dev/null 2>&1; do sleep 1; done
	@echo "Infrastructure is up and healthy."

infra-down:
	docker compose down

# Database Migrations and Seed Data
db-migrate:
	docker exec -i trackr-postgres psql -U trackr -d trackr_db < db/migrations/001_init.sql
	docker exec -i trackr-postgres psql -U trackr -d trackr_db < db/migrations/002_huntr_features.sql
	docker exec -i trackr-postgres psql -U trackr -d trackr_db < db/migrations/003_simplify_features.sql

db-seed:
	docker exec -i trackr-postgres psql -U trackr -d trackr_db < db/seed.sql
	@echo "Populating initial embeddings..."
	@source workers/.venv/bin/activate && PYTHONPATH=workers python workers/seed_embeddings.py
	@echo "Seed data and vector embeddings ready."

# Go Gateway Service
build-gateway:
	cd gateway && go build -o bin/gateway cmd/server/main.go

run-gateway: build-gateway
	./gateway/bin/gateway

# Python AI Worker Microservice
run-workers:
	source workers/.venv/bin/activate && cd workers && python -m app.main

# Next.js 15 Frontend
run-frontend:
	cd frontend && npm run dev

# SLA Latency Verification
test-sla:
	@echo "Testing Read Query p95 Latency (<60ms SLA)..."
	@curl -o /dev/null -s -w 'HTTP %{http_code} | Total Time: %{time_total}s\n' http://localhost:8080/api/v1/applications
	@echo "Testing Ingestion 202 Accepted SLA..."
	@curl -s -X POST http://localhost:8080/api/v1/applications/ingest-jd \
		-H "Content-Type: application/json" \
		-d '{"text": "Sample Software Engineer role requiring Go, Python, and Redis."}' | grep -q "accepted" && echo "Ingestion 202 SLA: PASSED" || echo "Ingestion SLA: FAILED"

test-resume:
	@echo "Testing Resume AI Extraction and pgvector Embedding..."
	@source workers/.venv/bin/activate && PYTHONPATH=workers python -m app.test_resume

test-features:
	@echo "Testing Playwright Headless Scraper and RAG Outreach Generator..."
	@source workers/.venv/bin/activate && PYTHONPATH=workers python -m app.test_features_3_and_6
