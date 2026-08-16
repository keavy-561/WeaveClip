#!/usr/bin/env bash
# WeaveClip 开发环境启动脚本
set -e

echo "=== 启动基础设施（PostgreSQL + Redis + MinIO）==="
docker-compose up -d

echo ""
echo "=== 启动 Go 后端 (:8080) ==="
(cd server && APP_ENV=dev go run ./cmd/server) &
BACKEND_PID=$!

echo "=== 启动前端 Vite (:3000) ==="
(cd web && pnpm dev) &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT

echo ""
echo "✓ 前端: http://localhost:3000"
echo "✓ 后端: http://localhost:8080/api/health"
echo "按 Ctrl+C 停止"

wait
