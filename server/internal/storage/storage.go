package storage

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// ErrNotFound 对象不存在。
var ErrNotFound = errors.New("storage: object not found")

// Storage 对象存储抽象：presign 直传 / 存在性校验 / 受控读写。
// S3/MinIO 由 minioStorage 实现，本地磁盘由 localDiskStorage 实现
//（MOCK_MODE 与单测用，同时提供 /api/mock-storage 回环端点）。
type Storage interface {
	// PresignPut 生成直传 PUT URL（有效期 expiry）。
	PresignPut(ctx context.Context, key string, expiry time.Duration) (string, error)
	// PresignGet 生成读取 GET URL（有效期 expiry），用于缩略图/渲染产物下载。
	PresignGet(ctx context.Context, key string, expiry time.Duration) (string, error)
	// Exists 返回对象是否存在及其大小（字节）。
	Exists(ctx context.Context, key string) (bool, int64, error)
	// Put 写入对象（缩略图、渲染产物等服务端产物）。
	Put(ctx context.Context, key string, r io.Reader, size int64, contentType string) error
	// Delete 删除对象（素材删除时清理）。
	Delete(ctx context.Context, key string) error
	// Ping 存储健康检查（deep health 用）。
	Ping(ctx context.Context) error
}

// ---- 本地磁盘实现 ----

// LocalDiskStorage 把对象写入本地根目录（key 即相对路径）。
type LocalDiskStorage struct {
	root       string
	publicBase string // 回环端点对外的基地址，如 http://localhost:8080
}

// NewLocalDiskStorage 创建本地磁盘存储；root 目录不存在会自动创建。
func NewLocalDiskStorage(root, publicBase string) (*LocalDiskStorage, error) {
	if err := os.MkdirAll(root, 0o755); err != nil {
		return nil, fmt.Errorf("create storage root: %w", err)
	}
	if publicBase == "" {
		publicBase = "http://localhost:8080"
	}
	return &LocalDiskStorage{root: root, publicBase: publicBase}, nil
}

// path 校验 key 并返回绝对路径；禁止越出根目录。
func (s *LocalDiskStorage) path(key string) (string, error) {
	clean := filepath.Clean("/" + key) // 以 / 开头再 Clean，去掉 ../ 穿越
	rel := strings.TrimPrefix(clean, "/")
	if rel == "" || rel == "." {
		return "", errors.New("storage: invalid key")
	}
	return filepath.Join(s.root, filepath.FromSlash(rel)), nil
}

func (s *LocalDiskStorage) mockURL(key string) string {
	return fmt.Sprintf("%s/api/mock-storage/%s", s.publicBase, key)
}

func (s *LocalDiskStorage) PresignPut(_ context.Context, key string, _ time.Duration) (string, error) {
	if _, err := s.path(key); err != nil {
		return "", err
	}
	return s.mockURL(key), nil
}

func (s *LocalDiskStorage) PresignGet(_ context.Context, key string, _ time.Duration) (string, error) {
	if _, err := s.path(key); err != nil {
		return "", err
	}
	return s.mockURL(key), nil
}

func (s *LocalDiskStorage) Exists(_ context.Context, key string) (bool, int64, error) {
	p, err := s.path(key)
	if err != nil {
		return false, 0, err
	}
	info, err := os.Stat(p)
	if err != nil {
		if os.IsNotExist(err) {
			return false, 0, nil
		}
		return false, 0, err
	}
	return true, info.Size(), nil
}

func (s *LocalDiskStorage) Put(_ context.Context, key string, r io.Reader, _ int64, _ string) error {
	p, err := s.path(key)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
		return fmt.Errorf("create object dir: %w", err)
	}
	f, err := os.Create(p)
	if err != nil {
		return fmt.Errorf("create object file: %w", err)
	}
	defer f.Close()
	if _, err := io.Copy(f, r); err != nil {
		return fmt.Errorf("write object: %w", err)
	}
	return nil
}

func (s *LocalDiskStorage) Delete(_ context.Context, key string) error {
	p, err := s.path(key)
	if err != nil {
		return err
	}
	if err := os.Remove(p); err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}

func (s *LocalDiskStorage) Ping(_ context.Context) error {
	probe := filepath.Join(s.root, ".ping-probe")
	if err := os.WriteFile(probe, []byte("ok"), 0o644); err != nil {
		return fmt.Errorf("storage not writable: %w", err)
	}
	_ = os.Remove(probe)
	return nil
}

// Root 暴露根目录（mock 存储回环端点使用）。
func (s *LocalDiskStorage) Root() string {
	return s.root
}
