# ABC Dashboard – Makefile
# Run from repo root. Requires .env (see docs/DEPLOYMENT-GUIDE.md).

.PHONY: help deploy deploy-sync up down down-volumes build db-reset db-reset-sync db-reset-sync-10 sync-10 wait-backend logs-backend

# Default target
help:
	@echo "ABC Dashboard – targets (run from repo root)"
	@echo ""
	@echo "  make deploy          Drop DB, (re)build images, start stack, migrate, seed"
	@echo "  make deploy-sync     Same as deploy + full license sync"
	@echo "  make up              Start stack (uses scripts/docker-compose-up.sh for enc: password)"
	@echo "  make down            Stop stack"
	@echo "  make down-volumes    Stop + remove volumes (fix enc: password mismatch)"
	@echo "  make build           Build backend + frontend images"
	@echo "  make db-reset        Drop DB, migrate, seed (stack must be running)"
	@echo "  make db-reset-sync   Same + full license sync"
	@echo "  make db-reset-sync-10  Same + sync 10 pages only (20 rows/page ≈ 200 licenses, quick test)"
	@echo "  make sync-10           Run license sync: 10 pages only (stack must be running, no DB reset)"
	@echo "  make wait-backend    Wait until backend container is up (for scripts)"
	@echo "  make logs-backend    Show backend container logs (debug startup failures)"
	@echo ""
	@echo "If backend is unhealthy: run 'make logs-backend'. See docs/DEPLOYMENT-GUIDE.md (Docker / DB password)."
	@echo ""

# Full redeploy: down → build → up → wait → drop DB + migrate + seed
deploy: down build up wait-backend db-reset
	@echo "✅ deploy done. Backend: http://localhost:5001  Frontend: http://localhost:3001"

# Same as deploy + license sync
deploy-sync: down build up wait-backend
	@$(MAKE) db-reset-sync
	@echo "✅ deploy-sync done. Backend: http://localhost:5001  Frontend: http://localhost:3001"

# Start stack (handles POSTGRES_PASSWORD=enc: via scripts)
up:
	@./scripts/docker-compose-up.sh up -d

# Stop stack
down:
	@docker compose down

# Stop stack and remove volumes (use when fixing DB password: then run make up so Postgres re-initializes)
down-volumes:
	@docker compose down -v

# Build backend and frontend images
build:
	@docker compose build backend frontend

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

# Drop DB, migrate, seed, then full license sync
db-reset-sync:
	@./scripts/docker-db-reset-sync.sh --drop --sync

# Drop DB, migrate, seed, then sync 10 pages only (20 rows/page ≈ 200 licenses, quick test)
db-reset-sync-10:
	@./scripts/docker-db-reset-sync.sh --drop --sync=10

# Run license sync: 10 pages only (no DB reset; stack must be running; 20 rows/page ≈ 200 licenses)
sync-10:
	@docker compose exec -e SYNC_MAX_PAGES=10 backend npm run sync:start

# Show backend logs (debug when backend is unhealthy)
logs-backend:
	@docker compose logs backend
