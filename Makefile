.PHONY: help install dev test lint security docker clean

help:
	@echo "Available commands:"
	@echo "  make install          - Install dependencies"
	@echo "  make dev              - Start development server"
	@echo "  make test             - Run all tests"
	@echo "  make test-unit        - Run unit tests only"
	@echo "  make test-int         - Run integration tests only"
	@echo "  make lint             - Run ESLint"
	@echo "  make lint-fix         - Fix ESLint issues"
	@echo "  make security         - Run security checks"
	@echo "  make quality          - Run full quality check"
	@echo "  make docker-build     - Build Docker image"
	@echo "  make docker-up        - Start Docker containers"
	@echo "  make docker-down      - Stop Docker containers"
	@echo "  make clean            - Clean artifacts"

install:
	npm install

dev:
	npm run dev

test:
	npm run test:all

test-unit:
	npm run test:unit

test-int:
	npm run test:integration

lint:
	npm run lint

lint-fix:
	npm run lint:fix

security:
	npm run security:all

quality: lint test security
	@echo "✅ All quality checks passed!"

docker-build:
	docker-compose build

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

clean:
	rm -rf node_modules coverage dist eslint-report.json
