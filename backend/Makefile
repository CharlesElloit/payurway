.PHONY: help install dev build start test test-watch test-coverage lint typecheck \
       prisma-generate prisma-migrate prisma-migrate-prod prisma-seed prisma-studio \
       docker-up docker-down docker-build docker-rebuild docker-logs docker-status \
       docker-shell-db docker-shell-redis docker-ps \
       docker-nuke docker-reset docker-prod-up docker-prod-down docker-prod-build docker-prod-logs \
       clean

# ─── Default ────────────────────────────────────────────────
.DEFAULT_GOAL := help

# ─── Local Development ──────────────────────────────────────
install: ## Install dependencies
	npm ci

dev: ## Start local dev server with hot reload
	npm run dev

build: prisma-generate ## Compile TypeScript
	npm run build

start: ## Start compiled production server
	npm run start

# ─── Testing ────────────────────────────────────────────────
test: ## Run all tests
	npm run test

test-watch: ## Run tests in watch mode
	npx jest --watch --forceExit

test-coverage: ## Run tests with coverage report
	npm run test:coverage

# ─── Code Quality ───────────────────────────────────────────
lint: ## Run linter
	npm run lint

typecheck: ## Run TypeScript type checking
	npx tsc --noEmit

# ─── Prisma ─────────────────────────────────────────────────
prisma-generate: ## Generate Prisma Client
	npx prisma generate

prisma-migrate: ## Create and apply dev migration
	npx prisma migrate dev

prisma-migrate-prod: ## Apply pending migrations (production)
	npx prisma migrate deploy

prisma-seed: ## Seed the database
	npm run prisma:seed

prisma-studio: ## Open Prisma Studio (browser UI)
	npx prisma studio

# ─── Docker — Development ───────────────────────────────────
docker-up: prisma-generate ## Start all dev containers (detached)
	docker compose up -d --build
	@echo ""
	@echo "  API:      http://localhost:3000"
	@echo "  Postgres: localhost:5433"
	@echo "  Redis:    localhost:6380"
	@echo "  pgAdmin:  http://localhost:5698"

docker-down: ## Stop all dev containers
	docker compose down

docker-build: ## Build backend image without starting
	docker compose build backend

docker-rebuild: ## Force rebuild (no cache) and restart
	docker compose down
	docker compose build --no-cache backend
	docker compose up -d
	@echo ""
	@echo "  API:      http://localhost:3000"
	@echo "  Postgres: localhost:5433"
	@echo "  Redis:    localhost:6380"
	@echo "  pgAdmin:  http://localhost:5698"

docker-logs: ## Tail logs from all containers
	docker compose logs -f

docker-logs-api: ## Tail backend API logs only
	docker compose logs -f backend

docker-logs-db: ## Tail PostgreSQL logs only
	docker compose logs -f postgres

docker-status: ## Show running container status
	docker compose ps

docker-ps: ## Show running container status (alias)
	@docker compose ps

docker-shell-db: ## Open psql shell in the PostgreSQL container
	docker compose exec postgres psql -U postgres -d paymybills

docker-shell-redis: ## Open redis-cli in the Redis container
	docker compose exec redis redis-cli

# ─── Docker — Nuke & Reset ──────────────────────────────────
docker-nuke: ## Stop containers and delete ALL volumes (DESTROYS DATA)
	@echo "⚠️  This will DELETE all data in postgres, redis, pgadmin, and logs."
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ] || (echo "Aborted." && exit 1)
	docker compose down -v --remove-orphans
	@echo "✅ All containers and volumes removed."

docker-reset: docker-nuke docker-up ## Nuke everything and start fresh
	@echo "✅ Reset complete."

# ─── Docker — Production ────────────────────────────────────
docker-prod-up: ## Start production stack
	docker compose -f docker-compose.prod.yml up -d
	@echo ""
	@echo "  Production stack started."

docker-prod-down: ## Stop production stack
	docker compose -f docker-compose.prod.yml down

docker-prod-build: ## Build production image
	docker compose -f docker-compose.prod.yml build

docker-prod-logs: ## Tail production logs
	docker compose -f docker-compose.prod.yml logs -f

docker-prod-nuke: ## Stop production and delete volumes
	docker compose -f docker-compose.prod.yml down -v --remove-orphans

# ─── Utility ────────────────────────────────────────────────
clean: ## Remove build artifacts and caches
	rm -rf dist/ coverage/ node_modules/.cache .tsbuildinfo
	@echo "✅ Cleaned build artifacts."

clean-all: clean ## Remove everything including node_modules
	rm -rf node_modules
	@echo "✅ Removed node_modules and build artifacts."

clean-docker: ## Remove dangling Docker images and build cache
	docker image prune -f
	docker builder prune -f
	@echo "✅ Docker cleanup complete."

# ─── Help ───────────────────────────────────────────────────
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-22s\033[0m %s\n", $$1, $$2}'
