.PHONY: dev build run test clean docker-up docker-down

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

# 启动本地基础设施（PostgreSQL + Redis + MinIO）
docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

clean:
	rm -rf bin/
