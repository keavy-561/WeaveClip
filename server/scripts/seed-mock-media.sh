#!/bin/bash
# 生成 mock 存储用的本地测试视频 + 缩略图（WeaveClip 编辑器素材面板填充用）
#
# 用途：后端 MOCK_MODE=true 时，媒体面板展示的视频素材指向 server/.mock-storage/mock/。
#       新克隆的机器若没有这些文件，素材面板的卡片会退化为占位色块、视频无法播放。
#       运行本脚本即可离线重建（仅用于本地开发/演示）。
#
# 用法：bash server/scripts/seed-mock-media.sh
# 依赖：ffmpeg（可用 winget install Gyan.FFmpeg 安装；FFMPEG_BINARY_PATH 可覆盖）
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MOCK_DIR="$REPO_ROOT/server/.mock-storage/mock"
FFMPEG_BIN="${FFMPEG_BINARY_PATH:-ffmpeg}"

command -v "$FFMPEG_BIN" >/dev/null 2>&1 || {
  echo "未找到 ffmpeg。Windows: winget install Gyan.FFmpeg；或以 FFMPEG_BINARY_PATH=/path/to/ffmpeg 指定" >&2
  exit 1
}

mkdir -p "$MOCK_DIR"

# 生成彩色测试视频（含静音音轨，保证浏览器端播放器有完整媒体流）
# 参数：文件名 宽 高 时长(秒)
gen_video() {
  local file="$1" w="$2" h="$3" dur="$4" color="$5"
  local out="$MOCK_DIR/$file"
  [ -f "$out" ] && return 0
  "$FFMPEG_BIN" -y -hide_banner -loglevel error \
    -f lavfi -i "color=c=${color}:s=${w}x${h}:r=30" \
    -f lavfi -i anullsrc=r=44100:cl=stereo \
    -c:v libx264 -t "$dur" -pix_fmt yuv420p -movflags +faststart \
    -c:a aac -ar 44100 -ac 2 -shortest "$out"
  # 截取 1 秒处帧作为缩略图（320 宽，与素材卡片比例一致）
  "$FFMPEG_BIN" -y -hide_banner -loglevel error \
    -ss 00:00:01 -i "$out" -frames:v 1 -q:v 2 -vf "scale=320:-1" \
    "${MOCK_DIR}/${file%.mp4}_thumb.jpg"
  echo "generated $file"
}

# 文件           宽    高    时长  颜色
gen_video nyc_bridge.mp4        1920 1080 15.2 blue
gen_video times_square.mp4      1920 1080 22.5 red
gen_video central_park.mp4      1920 1080 12.8 green
gen_video product_closeup.mp4   1920 1080 10.4 orange
gen_video product_lifestyle.mp4 1920 1080 16.8 purple
gen_video beach_waves.mp4       1080 1920 14.6 cyan
gen_video sunset_shore.mp4      1080 1920 20.2 yellow
gen_video beach_crowd.mp4       1080 1920 11.9 magenta

echo "done → $MOCK_DIR"
