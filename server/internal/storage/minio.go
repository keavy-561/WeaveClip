package storage

import (
	"context"
	"fmt"
	"io"
	"net/url"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"

	"github.com/weaveclip/server/internal/config"
)

// MinioStorage 基于 MinIO/S3 的对象存储实现。
type MinioStorage struct {
	client *minio.Client
	bucket string
	region string
}

// NewMinioStorage 创建 MinIO 客户端并确保 bucket 存在（启动即可写）。
func NewMinioStorage(cfg config.StorageConfig) (*MinioStorage, error) {
	secure := false
	if cfg.Secure {
		secure = true
	}
	client, err := minio.New(cfg.Endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.AccessKey, cfg.SecretKey, ""),
		Secure: secure,
		Region: cfg.Region,
	})
	if err != nil {
		return nil, fmt.Errorf("create minio client: %w", err)
	}
	s := &MinioStorage{client: client, bucket: cfg.Bucket, region: cfg.Region}
	// bucket 就绪探测带重试：CI/容器编排里 MinIO 服务可能晚于本进程就绪
	var lastErr error
	for attempt := 0; attempt < 5; attempt++ {
		if attempt > 0 {
			time.Sleep(time.Duration(attempt) * time.Second)
		}
		if err := s.ensureBucket(context.Background()); err != nil {
			lastErr = err
			continue
		}
		return s, nil
	}
	return nil, lastErr
}

func (s *MinioStorage) ensureBucket(ctx context.Context) error {
	exists, err := s.client.BucketExists(ctx, s.bucket)
	if err != nil {
		return fmt.Errorf("check bucket %s: %w", s.bucket, err)
	}
	if exists {
		return nil
	}
	if err := s.client.MakeBucket(ctx, s.bucket, minio.MakeBucketOptions{Region: s.region}); err != nil {
		// 部分部署对 bucket 创建有权限限制，这里把错误带出来由调用方降级
		return fmt.Errorf("create bucket %s: %w", s.bucket, err)
	}
	return nil
}

func (s *MinioStorage) PresignPut(ctx context.Context, key string, expiry time.Duration) (string, error) {
	u, err := s.client.PresignedPutObject(ctx, s.bucket, key, expiry)
	if err != nil {
		return "", fmt.Errorf("presign put %s: %w", key, err)
	}
	return u.String(), nil
}

func (s *MinioStorage) PresignGet(ctx context.Context, key string, expiry time.Duration) (string, error) {
	u, err := s.client.PresignedGetObject(ctx, s.bucket, key, expiry, url.Values{})
	if err != nil {
		return "", fmt.Errorf("presign get %s: %w", key, err)
	}
	return u.String(), nil
}

func (s *MinioStorage) Exists(ctx context.Context, key string) (bool, int64, error) {
	info, err := s.client.StatObject(ctx, s.bucket, key, minio.StatObjectOptions{})
	if err != nil {
		resp := minio.ToErrorResponse(err)
		if resp.Code == "NoSuchKey" || resp.Code == "NoSuchBucket" {
			return false, 0, nil
		}
		return false, 0, fmt.Errorf("stat object %s: %w", key, err)
	}
	return true, info.Size, nil
}

func (s *MinioStorage) Put(ctx context.Context, key string, r io.Reader, size int64, contentType string) error {
	_, err := s.client.PutObject(ctx, s.bucket, key, r, size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return fmt.Errorf("put object %s: %w", key, err)
	}
	return nil
}

func (s *MinioStorage) Delete(ctx context.Context, key string) error {
	if err := s.client.RemoveObject(ctx, s.bucket, key, minio.RemoveObjectOptions{}); err != nil {
		return fmt.Errorf("remove object %s: %w", key, err)
	}
	return nil
}

func (s *MinioStorage) Ping(ctx context.Context) error {
	ok, err := s.client.BucketExists(ctx, s.bucket)
	if err != nil {
		return fmt.Errorf("bucket probe %s: %w", s.bucket, err)
	}
	if !ok {
		return fmt.Errorf("bucket %s not found", s.bucket)
	}
	return nil
}
