package storage

import (
	"log/slog"

	"github.com/weaveclip/server/internal/config"
)

// Init 按配置初始化存储：MinIO 可用则用之；不可用回落本地磁盘。
// 返回本地磁盘根目录（非空表示处于本地盘模式，server 需注册回环端点）。
func Init(cfg config.StorageConfig, fallbackRoot, publicBase string, logger *slog.Logger) (Storage, string, error) {
	if cfg.Endpoint != "" {
		ms, err := NewMinioStorage(cfg)
		if err == nil {
			return ms, "", nil
		}
		logger.Warn("minio init failed, fallback to local disk storage", "error", err)
	}
	ls, err := NewLocalDiskStorage(fallbackRoot, publicBase)
	if err != nil {
		return nil, "", err
	}
	return ls, fallbackRoot, nil
}
