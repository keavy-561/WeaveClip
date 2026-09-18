package tests

import (
	"context"
	"path/filepath"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/weaveclip/server/internal/model"
	"github.com/weaveclip/server/internal/repository"
	"github.com/weaveclip/server/internal/service"
	"github.com/weaveclip/server/internal/storage"
)

type fixedProjectFinder struct{ project model.Project }

func (f *fixedProjectFinder) GetProject(id, userID uint) (*model.Project, error) {
	if f.project.ID == id && f.project.UserID == userID {
		p := f.project
		return &p, nil
	}
	return nil, service.ErrProjectNotFound
}

func newUploadTestService(t *testing.T) (*service.UploadService, storage.Storage) {
	t.Helper()
	dir := t.TempDir()
	store, err := storage.NewLocalDiskStorage(filepath.Join(dir, "store"), "http://localhost:18080")
	require.NoError(t, err)
	finder := &fixedProjectFinder{project: model.Project{ID: 1, UserID: 1}}
	// ffprobe/ffmpeg 指向不存在的路径 → 管线降级为 skipped，只验证直传链路
	svc := service.NewUploadService(
		repository.NewMockAssetRepo(nil), finder, store, "/nonexistent/ffprobe", "/nonexistent/ffmpeg")
	return svc, store
}

func TestUploadService_PresignConfirmFlow(t *testing.T) {
	svc, store := newUploadTestService(t)
	ctx := context.Background()

	// 1. presign
	asset, uploadURL, err := svc.Presign(1, 1, "clip.mp4", 1024, "video")
	require.NoError(t, err)
	assert.Equal(t, "uploading", asset.Status)
	assert.Contains(t, uploadURL, "/api/mock-storage/projects/1/")
	assert.True(t, strings.HasSuffix(asset.StoragePath, "/clip.mp4"))

	// 2. 模拟客户端 PUT：直接写对象
	require.NoError(t, store.Put(ctx, asset.StoragePath, strings.NewReader("fake-video-bytes"), 16, "video/mp4"))

	// 3. confirm
	confirmed, err := svc.Confirm(asset.ID, 1)
	require.NoError(t, err)
	assert.Equal(t, "ready", confirmed.Status)
	assert.Equal(t, int64(16), confirmed.FileSize)

	// 4. 重复 confirm 应报状态错误
	_, err = svc.Confirm(asset.ID, 1)
	assert.ErrorIs(t, err, service.ErrInvalidState)
}

func TestUploadService_Rejections(t *testing.T) {
	svc, store := newUploadTestService(t)

	// 非法类型
	_, _, err := svc.Presign(1, 1, "a.txt", 10, "text")
	assert.ErrorIs(t, err, service.ErrInvalidUpload)

	// 超限大小
	_, _, err = svc.Presign(1, 1, "a.mp4", service.MaxUploadSize+1, "video")
	assert.ErrorIs(t, err, service.ErrInvalidUpload)

	// 路径穿越文件名
	_, _, err = svc.Presign(1, 1, "../evil.mp4", 10, "video")
	require.NoError(t, err) // filepath.Base 清洗后放行，但存储 key 不越界

	// confirm 不存在的素材
	_, err = svc.Confirm(999, 1)
	assert.ErrorIs(t, err, service.ErrAssetNotFound)

	// confirm 未上传对象
	asset, _, err := svc.Presign(1, 1, "b.mp4", 10, "video")
	require.NoError(t, err)
	_, err = svc.Confirm(asset.ID, 1)
	assert.ErrorIs(t, err, service.ErrObjectMissing)

	// 非属主访问
	_, err = svc.Confirm(asset.ID, 2)
	assert.ErrorIs(t, err, service.ErrAssetNotFound)

	_ = store
}
