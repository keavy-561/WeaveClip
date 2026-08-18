.PHONY: dev build run test test-race test-coverage clean docker-up docker-down migrate-up migrate-down migrate-status smoke lint

# 启动后端开发服务（默认 dev 环境）
dev:
	APP_ENV=dev go run ./cmd/server

# 编译
build:
	go build -o bin/server ./cmd/server

run: build
	./bin/server

# 单元测试（本地快速测试，不依赖数据库）
test:
	go test ./...

# 竞态检测测试
test-race:
	go test -race ./...

# 覆盖率测试
test-coverage:
	go test -race -coverprofile=coverage.out -covermode=atomic ./...
	go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report generated: coverage.html"

# 数据库迁移
migrate-up:
	@read -p "This will apply migrations to the database. Continue? [y/N] " ans; \
	if [ "$$ans" != "y" ]; then echo "aborted"; exit 1; fi
	@go run ./cmd/migrate up

migrate-down:
	@read -p "This will apply migrations to the database. Continue? [y/N] " ans; \
	if [ "$$ans" != "y" ]; then echo "aborted"; exit 1; fi
	@go run ./cmd/migrate down

migrate-status:
	@go run ./cmd/migrate status

# 启动本地基础设施（PostgreSQL + Redis + MinIO）
docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

# 冒烟测试（需要先启动服务和基础设施）
smoke:
	@bash tests/smoke/health.sh && bash tests/smoke/auth.sh && bash tests/smoke/assets.sh

# 代码检查
lint:
	golangci-lint run ./...

clean:
	rm -rf bin/ coverage.out coverage.html
