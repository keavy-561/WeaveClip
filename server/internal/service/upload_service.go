package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/weaveclip/server/internal/media"
	"github.com/weaveclip/server/internal/model"
	"github.com/weaveclip/server/internal/repository"
	"github.com/weaveclip/server/internal/storage"
)

// 上传链路错误（handler 映射为 400/404/409）。
var (
	ErrAssetNotFound  = errors.New("asset not found")
	ErrInvalidUpload  = errors.New("invalid upload request")
	ErrObjectMissing  = errors.New("uploaded object not found")
	ErrInvalidState   = errors.New("asset not in uploading state")
	ErrStorageMissing = errors.New("storage unavailable")
)

const (
	// MaxUploadSize 单文件上限 500MB（与前端校验一致）。
	MaxUploadSize int64 = 500 << 20
	// presign 有效期：短时效直传 URL，压缩"确认前对象被改写"的窗口（工单 WO8-14）。
	presignExpiry = 15 * time.Minute
)

var allowedAssetTypes = map[string]bool{"video": true, "audio": true, "image": true}

// UploadService 素材直传（presign/confirm）与上传后处理管线（工单 B06/B07）。
type UploadService struct {
	assets  repository.AssetRepository
	proj    ProjectFinder
	store   storage.Storage
	tools   media.Tools
	toolsOK bool
}

// NewUploadService 创建上传服务；工具缺失时管线自动降级为 skipped。
func NewUploadService(assets repository.AssetRepository, proj ProjectFinder, store storage.Storage,
	ffprobePath, ffmpegPath string) *UploadService {
	tools, ok := media.LookupTools(ffprobePath, ffmpegPath)
	return &UploadService{assets: assets, proj: proj, store: store, tools: tools, toolsOK: ok}
}

// Presign 创建素材记录并返回直传 URL。
func (s *UploadService) Presign(projectID, userID uint, fileName string, fileSize int64, typ string) (*model.Asset, string, error) {
	if _, err := s.proj.GetProject(projectID, userID); err != nil {
		return nil, "", ErrProjectNotFound
	}
	if !allowedAssetTypes[typ] {
		return nil, "", fmt.Errorf("%w: unsupported type %q", ErrInvalidUpload, typ)
	}
	if fileSize <= 0 || fileSize > MaxUploadSize {
		return nil, "", fmt.Errorf("%w: file size %d out of range", ErrInvalidUpload, fileSize)
	}
	// 只取文件名部分，防路径穿越
	fileName = filepath.Base(fileName)
	if fileName == "" || fileName == "." || fileName == "/" {
		return nil, "", fmt.Errorf("%w: invalid file name", ErrInvalidUpload)
	}

	asset := &model.Asset{ProjectID: projectID, Type: typ, FileName: fileName, Status: "uploading"}
	if err := s.assets.Create(asset); err != nil {
		return nil, "", err
	}
	asset.StoragePath = fmt.Sprintf("projects/%d/%d/%s", projectID, asset.ID, fileName)
	if err := s.assets.Update(asset); err != nil {
		// 孤儿清理：storagePath 都没落上的记录无人认领（工单 WO8-14）
		if delErr := s.assets.Delete(asset.ID); delErr != nil {
			slog.Error("cleanup orphan asset failed", "assetId", asset.ID, "error", delErr)
		}
		return nil, "", err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	uploadURL, err := s.store.PresignPut(ctx, asset.StoragePath, presignExpiry)
	if err != nil {
		// 孤儿清理：presign 失败的 uploading 记录无人认领（工单 WO8-14）
		if delErr := s.assets.Delete(asset.ID); delErr != nil {
			slog.Error("cleanup orphan asset failed", "assetId", asset.ID, "error", delErr)
		}
		return nil, "", fmt.Errorf("presign failed: %w", err)
	}
	return asset, uploadURL, nil
}

// Confirm 校验对象已上传、落库为 ready，并异步触发元数据/缩略图处理。
func (s *UploadService) Confirm(assetID, userID uint) (*model.Asset, error) {
	asset, err := s.assets.Get(assetID)
	if err != nil {
		return nil, ErrAssetNotFound
	}
	if _, err := s.proj.GetProject(asset.ProjectID, userID); err != nil {
		return nil, ErrAssetNotFound
	}
	if asset.Status == "ready" {
		// 幂等：网络重试的 confirm 直接返回现有资产，而不是 409 卡死重试方（工单 WO8-14）
		return asset, nil
	}
	if asset.Status != "uploading" {
		return nil, ErrInvalidState
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	exists, size, err := s.store.Exists(ctx, asset.StoragePath)
	if err != nil {
		return nil, fmt.Errorf("check object: %w", err)
	}
	if !exists {
		return nil, ErrObjectMissing
	}
	if size > MaxUploadSize {
		return nil, fmt.Errorf("%w: object size %d exceeds limit", ErrInvalidUpload, size)
	}
	// 局部回写确认字段：不整行覆盖并发流程（分析等）刚写入的列（工单 WO8-10）
	if err := s.assets.UpdateMediaInfo(asset.ID, repository.AssetMediaInfo{
		Status:   "ready",
		FileSize: size,
	}); err != nil {
		return nil, err
	}
	asset.FileSize = size
	asset.Status = "ready"

	// 异步处理：失败只记 metadata，不影响上传结果
	go s.processAsset(*asset)
	return asset, nil
}

// processAsset 上传后处理：视频提取元数据 + 缩略图；图片自身即缩略图；工具缺失降级。
func (s *UploadService) processAsset(asset model.Asset) {
	defer func() {
		if r := recover(); r != nil {
			slog.Error("asset processing panic", "assetId", asset.ID, "panic", r)
		}
	}()
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	switch asset.Type {
	case "image":
		asset.ThumbnailURL = asset.StoragePath
		asset.Metadata = marshalProcessingMeta("succeeded", "")
	case "video":
		if !s.toolsOK {
			asset.Metadata = marshalProcessingMeta("skipped", "ffmpeg/ffprobe not available")
			s.persistMediaInfo(asset)
			return
		}
		if err := s.processVideo(ctx, &asset); err != nil {
			slog.Warn("asset processing failed", "assetId", asset.ID, "error", err)
			asset.Metadata = marshalProcessingMeta("failed", err.Error())
		}
	default:
		asset.Metadata = marshalProcessingMeta("skipped", "no processing for type "+asset.Type)
	}
	s.persistMediaInfo(asset)
}

func (s *UploadService) processVideo(ctx context.Context, asset *model.Asset) error {
	tmp, err := os.CreateTemp("", "weaveclip-src-*"+filepath.Ext(asset.FileName))
	if err != nil {
		return fmt.Errorf("create temp file: %w", err)
	}
	tmpName := tmp.Name()
	defer os.Remove(tmpName)

	// 经预签名 URL 下载对象到本地临时文件（限流 500MB）
	getURL, err := s.store.PresignGet(ctx, asset.StoragePath, presignExpiry)
	if err != nil {
		tmp.Close()
		return err
	}
	resp, err := http.Get(getURL)
	if err != nil {
		tmp.Close()
		return fmt.Errorf("fetch object: %w", err)
	}
	// 非响应错误（403/404 的错误体）不能当视频落盘，否则 probe 失败信息误导排查（工单 WO8-20）
	if resp.StatusCode != http.StatusOK {
		_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 4096))
		resp.Body.Close()
		tmp.Close()
		return fmt.Errorf("fetch object: unexpected status %d", resp.StatusCode)
	}
	_, copyErr := io.Copy(tmp, io.LimitReader(resp.Body, MaxUploadSize+1))
	closeErr := resp.Body.Close()
	closeFileErr := tmp.Close()
	if copyErr != nil {
		return fmt.Errorf("download object: %w", copyErr)
	}
	if closeErr != nil {
		return closeErr
	}
	if closeFileErr != nil {
		return closeFileErr
	}

	probe, err := media.Probe(ctx, s.tools, tmpName)
	if err != nil {
		return err
	}
	asset.Duration = probe.Duration
	asset.Width = probe.Width
	asset.Height = probe.Height
	asset.FPS = probe.FPS
	asset.Codec = probe.Codec

	thumbKey := fmt.Sprintf("thumbnails/%d.jpg", asset.ID)
	thumbStored, err := media.Thumbnail(ctx, s.tools, tmpName, s.store, thumbKey)
	if err != nil {
		// 缩略图失败不阻塞元数据入库
		asset.Metadata = marshalProcessingMeta("partial", err.Error())
		return nil
	}
	asset.ThumbnailURL = thumbStored
	asset.Metadata = marshalProcessingMeta("succeeded", "")
	return nil
}

// persistMediaInfo 局部回写处理产物列：不整行覆盖，避免清空并发流程（分析 worker）
// 刚写入的 analysis/transcript 列（工单 WO8-10）。
func (s *UploadService) persistMediaInfo(asset model.Asset) {
	if err := s.assets.UpdateMediaInfo(asset.ID, repository.AssetMediaInfo{
		Status:       asset.Status,
		FileSize:     asset.FileSize,
		Duration:     asset.Duration,
		Width:        asset.Width,
		Height:       asset.Height,
		FPS:          asset.FPS,
		Codec:        asset.Codec,
		ThumbnailURL: asset.ThumbnailURL,
		Metadata:     asset.Metadata,
	}); err != nil {
		slog.Error("save processed asset failed", "assetId", asset.ID, "error", err)
	}
}

func marshalProcessingMeta(status, msg string) []byte {
	meta := map[string]string{"processing": status, "detail": msg}
	b, err := json.Marshal(meta)
	if err != nil {
		return []byte(`{"processing":"unknown"}`)
	}
	return b
}

// DecoratePlayback 为音视频素材生成可播放的预签名 URL（展示层关注点）。
func (s *UploadService) DecoratePlayback(asset *model.Asset) {
	if s == nil || asset == nil || asset.StoragePath == "" || s.store == nil {
		return
	}
	if strings.HasPrefix(asset.StoragePath, "http://") || strings.HasPrefix(asset.StoragePath, "https://") {
		asset.PlaybackURL = asset.StoragePath
		return
	}
	// mock 本地磁盘存储：通过 mock-storage 回环端点提供可访问地址
	if strings.HasPrefix(asset.StoragePath, "/mock/") || strings.HasPrefix(asset.StoragePath, "mock/") {
		key := strings.TrimPrefix(asset.StoragePath, "/")
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if u, err := s.store.PresignGet(ctx, key, 24*time.Hour); err == nil {
			asset.PlaybackURL = u
		}
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if u, err := s.store.PresignGet(ctx, asset.StoragePath, 24*time.Hour); err == nil {
		asset.PlaybackURL = u
	}
}

// DecorateThumbnail 把缩略图存储 key 换成可访问的预签名 URL（展示层关注点）。
func (s *UploadService) DecorateThumbnail(asset *model.Asset) {
	if s == nil || asset == nil || asset.ThumbnailURL == "" || s.store == nil {
		return
	}
	if strings.HasPrefix(asset.ThumbnailURL, "http://") || strings.HasPrefix(asset.ThumbnailURL, "https://") {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if u, err := s.store.PresignGet(ctx, asset.ThumbnailURL, 24*time.Hour); err == nil {
		asset.ThumbnailURL = u
	}
}
