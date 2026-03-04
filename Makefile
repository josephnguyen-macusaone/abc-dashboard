# ABC Dashboard – Makefile
# Run from repo root. Requires .env (see docs/DEPLOYMENT-GUIDE.md).

.PHONY: help deploy deploy-sync up up-backend down down-volumes build db-reset db-reset-sync sync-10 wait-backend logs-backend

# Default target
help:
	@echo "ABC Dashboard – targets (run from repo root)"
	@echo ""
	@echo "  make deploy            Drop DB, (re)build backend, start backend (+ deps), migrate, seed"
	@echo "  make deploy-sync       Same as deploy + full license sync"
	@echo "  make up                Start full stack (uses scripts/docker-compose-up.sh for enc: password)"
	@echo "  make up-backend        Start backend only (+ postgres, redis, etc.)"
	@echo "  make down              Stop stack"
	@echo "  make down-volumes      Stop + remove volumes (fix enc: password mismatch)"
	@echo "  make build             Build backend image only"
	@echo "  make db-reset          Drop DB, migrate, seed (stack must be running)"
	@echo "  make db-reset-sync     Same + license sync (full). Quick test: make db-reset-sync SYNC=10"
	@echo "  make sync-10           Sync only, 10 pages (no DB reset; stack must be running)"
	@echo "  make wait-backend      Wait until backend is up (used by deploy)"
	@echo "  make logs-backend      Backend container logs (debug unhealthy backend)"
	@echo ""
	@echo "If backend is unhealthy: run 'make logs-backend'. See docs/DEPLOYMENT-GUIDE.md (Docker / DB password)."
	@echo ""

# Full redeploy (backend only): down → build backend → up backend → wait → drop DB + migrate + seed
deploy: down build up-backend wait-backend db-reset
	@echo "✅ deploy done. Backend: http://localhost:5001"

# Same as deploy + license sync
deploy-sync: down build up-backend wait-backend
	@$(MAKE) db-reset-sync
	@echo "✅ deploy-sync done. Backend: http://localhost:5001"

# Start stack (handles POSTGRES_PASSWORD=enc: via scripts)
up:
	@./scripts/docker-compose-up.sh up -d

# Start backend only (+ deps: postgres, redis, etc.)
up-backend:
	@./scripts/docker-compose-up.sh up -d backend

# Stop stack
down:
	@docker compose down

# Stop stack and remove volumes (use when fixing DB password: then run make up so Postgres re-initializes)
down-volumes:
	@docker compose down -v

# Build backend image only
build:
	@docker compose build backend

# Wait for backend to be up (needed after 'up' before db-reset)
wait-backend:
	@echo "Waiting for backend to be ready..."
	@for i in 1 2 3 4 5 6 7 8 9 10; do \
	  if docker compose ps backend 2>/dev/null | grep -q Up; then \
	    sleep 5; \
	    if docker compose exec backend curl -sf http://localhost:5000/api/v1/health >/dev/null 2>&1; then \
	      echo "Backend is ready."; \
	      exit 0; \
	    fi; \
	  fi; \
	  sleep 3; \
	done; \
	echo ""; \
	echo "Backend did not become ready. Common cause: PostgreSQL password mismatch."; \
	echo "  • Run: make logs-backend"; \
	echo "  • If you see 'password authentication failed': see docs/DEPLOYMENT-GUIDE.md (Docker / database)."; \
	echo "  • If using POSTGRES_PASSWORD=enc:..., start with: ./scripts/docker-compose-up.sh up -d"; \
	exit 1

# Drop DB, migrate, seed (requires stack running)
db-reset:
	@./scripts/docker-db-reset-sync.sh --drop

# Drop DB, migrate, seed, then license sync. Full sync by default; SYNC=10 for quick test (10 pages).
db-reset-sync:
	@./scripts/docker-db-reset-sync.sh --drop $(if $(SYNC),--sync=$(SYNC),--sync)

# Run license sync: 10 pages only (no DB reset; stack must be running; 20 rows/page ≈ 200 licenses)
sync-10:
	@docker compose exec -e SYNC_MAX_PAGES=10 backend npm run sync:start

# Show backend logs (debug when backend is unhealthy)
logs-backend:
	@docker compose logs backend
