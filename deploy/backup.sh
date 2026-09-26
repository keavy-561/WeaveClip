#!/usr/bin/env bash
# WeaveClip 备份脚本（工单 WO11-08）：PostgreSQL 逻辑备份 + MinIO 对象镜像。
# 建议 cron 每日执行：0 3 * * * /path/to/deploy/backup.sh
# 依赖：docker compose（在仓库根目录执行）、pg_dump、mc（MinIO 客户端，容器内自带）。
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
STAMP="$(date +%Y%m%d-%H%M%S)"
PG_USER="${POSTGRES_USER:-weaveclip}"
PG_DB="${POSTGRES_DB:-weaveclip}"
MINIO_BUCKET="${MINIO_BUCKET:-weaveclip}"

mkdir -p "$BACKUP_DIR"

echo "[backup] database -> $BACKUP_DIR/weaveclip-db-$STAMP.sql.gz"
docker compose exec -T postgres pg_dump -U "$PG_USER" "$PG_DB" \
  | gzip > "$BACKUP_DIR/weaveclip-db-$STAMP.sql.gz"

echo "[backup] minio bucket '$MINIO_BUCKET' -> $BACKUP_DIR/minio-$STAMP"
# mc alias 在 minio 容器内默认为 local（见 minio 镜像启动配置）；别名/桶名不同请按需调整
if docker compose exec -T minio mc mirror --overwrite "local/$MINIO_BUCKET" \
    > "$BACKUP_DIR/minio-$STAMP.log" 2>&1; then
  echo "[backup] minio mirror ok"
else
  echo "[backup] minio mirror failed，详见 $BACKUP_DIR/minio-$STAMP.log（检查 mc alias 与桶名）"
fi

# 保留最近 14 天
find "$BACKUP_DIR" -type f -name 'weaveclip-db-*.sql.gz' -mtime +14 -delete
echo "[backup] done: $BACKUP_DIR"
