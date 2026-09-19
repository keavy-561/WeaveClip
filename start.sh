#!/bin/bash
# 启动 WeaveClip 前后端（完全脱离会话，不会随 shell 退出）
cd "$(dirname "$0")"

LOG_DIR="$(dirname "$0")/../_run_logs"
mkdir -p "$LOG_DIR"

# 后端
cd server
set -a && . ./.env && set +a
setsid env MOCK_STORAGE_PUBLIC_BASE=http://localhost:18081 \
  ./bin/weaveclip-server > "$LOG_DIR/backend.log" 2>&1 < /dev/null &
echo "backend PID=$!"

# 前端
cd ../web
setsid ./node_modules/.bin/vite --host 0.0.0.0 --port 3000 \
  > "$LOG_DIR/frontend.log" 2>&1 < /dev/null &
echo "frontend PID=$!"
