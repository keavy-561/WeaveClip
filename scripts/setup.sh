#!/usr/bin/env bash
# WeaveClip 一键初始化环境检查
set -e

echo "=== WeaveClip 环境检查 ==="

check() {
  if command -v $1 &> /dev/null; then
    echo "✓ $1 已安装: $($1 --version 2>/dev/null | head -1)"
  else
    echo "✗ $1 未安装"
    return 1
  fi
}

FAILED=0
check node || FAILED=1
check pnpm || FAILED=1
check go || FAILED=1
check docker || FAILED=1
check ffmpeg || FAILED=1

if [ $FAILED -eq 1 ]; then
  echo ""
  echo "缺少依赖，请安装："
  echo "  node    → https://nodejs.org (LTS)"
  echo "  pnpm    → npm install -g pnpm"
  echo "  go      → https://go.dev/dl (1.22+)"
  echo "  docker  → https://docker.com (含 docker compose)"
  echo "  ffmpeg  → https://ffmpeg.org 或 winget install ffmpeg"
  exit 1
fi

echo ""
echo "=== 安装前端依赖 ==="
cd web && pnpm install && cd ..

echo ""
echo "=== 安装后端依赖 ==="
cd server && go mod download && cd ..

echo ""
echo "✓ 环境就绪！运行 ./scripts/dev.sh 启动开发环境"
