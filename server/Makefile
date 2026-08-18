.PHONY: dev build run test clean docker-up docker-down migrate-up migrate-down migrate-status

# 启动后端开发服务（默认 dev 环境）
dev:
	APP_ENV=dev go run ./cmd/server

# 编译
build:
	go build -o bin/server ./cmd/server

run: build
	./bin/server

test:
	go test ./...

# 数据库迁移
migrate-up:
	@read -p "This will apply migrations to the database. Continue? [y/N] " ans; \
	if [ "$$ans" != "y" ]; then echo "aborted"; exit 1; fi
	@go run ./cmd/migrate up

migrate-down:
	@read -p "This will rollback migrations. Continue? [y/N] " ans; \
	if [ "$$ans" != "y" ]; then echo "aborted"; exit 1; fi
	@go run ./cmd/migrate down

migrate-status:
	@go run ./cmd/migrate status

# 启动本地基础设施（PostgreSQL + Redis + MinIO）
docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

clean:
	rm -rf bin/
