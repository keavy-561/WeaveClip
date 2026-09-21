package handler

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/weaveclip/server/internal/model"
	"github.com/weaveclip/server/internal/service"
)

// AssetHandler asset CRUD
type AssetHandler struct {
	assetService *service.AssetService
	uploads      *service.UploadService
}

func NewAssetHandler(assetService *service.AssetService, uploads *service.UploadService) *AssetHandler {
	return &AssetHandler{assetService: assetService, uploads: uploads}
}

type CreateAssetReq struct {
	Type         string `json:"type" binding:"required"` // video | audio | image
	StoragePath  string `json:"storagePath" binding:"required"`
	FileName     string `json:"fileName" binding:"required"`
	FileSize     int64  `json:"fileSize"`
	Duration     float64 `json:"duration"`
	Width        int    `json:"width"`
	Height       int    `json:"height"`
	ThumbnailURL string `json:"thumbnailUrl"`
	FPS          float64 `json:"fps"`
	Codec        string `json:"codec"`
}

// List GET /api/projects/:id/assets
func (h *AssetHandler) List(c *gin.Context) {
	projectID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		BadRequest(c, "invalid project id")
		return
	}
	userID, _ := c.Get("user_id")
	uid, _ := userID.(uint)

	assets, err := h.assetService.ListAssets(uint(projectID), uid)
	if err != nil {
		InternalError(c, "failed to list assets")
		return
	}
	for i := range assets {
		h.uploads.DecorateThumbnail(&assets[i])
		h.uploads.DecoratePlayback(&assets[i])
	}
	OK(c, gin.H{"assets": assets})
}

// Create POST /api/projects/:id/assets
func (h *AssetHandler) Create(c *gin.Context) {
	projectID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		BadRequest(c, "invalid project id")
		return
	}
	var req CreateAssetReq
	if err := c.ShouldBindJSON(&req); err != nil {
		BadRequest(c, "invalid request body")
		return
	}

	userID, _ := c.Get("user_id")
	uid, _ := userID.(uint)

	asset := &model.Asset{
		Type:         req.Type,
		StoragePath:  req.StoragePath,
		FileName:     req.FileName,
		FileSize:     req.FileSize,
		Duration:     req.Duration,
		Width:        req.Width,
		Height:       req.Height,
		ThumbnailURL: req.ThumbnailURL,
		FPS:          req.FPS,
		Codec:        req.Codec,
	}
	created, err := h.assetService.CreateAsset(uint(projectID), uid, asset)
	if err != nil {
		if errors.Is(err, service.ErrInvalidStoragePath) {
			BadRequest(c, "storage path does not belong to this project")
			return
		}
		if err.Error() == "project not found" {
			NotFound(c, "project not found")
			return
		}
		InternalError(c, "failed to create asset")
		return
	}
	Created(c, gin.H{"asset": created})
}

// Get GET /api/assets/:id
func (h *AssetHandler) Get(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		BadRequest(c, "invalid asset id")
		return
	}
	userID, _ := c.Get("user_id")
	uid, _ := userID.(uint)

	asset, err := h.assetService.GetAsset(uint(id), uid)
	if err != nil {
		NotFound(c, "asset not found")
		return
	}
	h.uploads.DecorateThumbnail(asset)
	h.uploads.DecoratePlayback(asset)
	OK(c, gin.H{"asset": asset})
}

// PresignAssetReq 预签名直传请求。
type PresignAssetReq struct {
	Type     string `json:"type" binding:"required"` // video | audio | image
	FileName string `json:"fileName" binding:"required"`
	FileSize int64  `json:"fileSize"`
}

// Presign POST /api/projects/:id/assets/presign（工单 B06）
func (h *AssetHandler) Presign(c *gin.Context) {
	projectID, ok := parseIDParam(c)
	if !ok {
		return
	}
	var req PresignAssetReq
	if err := c.ShouldBindJSON(&req); err != nil {
		BadRequest(c, "invalid request body")
		return
	}
	asset, uploadURL, err := h.uploads.Presign(projectID, currentUserID(c), req.FileName, req.FileSize, req.Type)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrProjectNotFound):
			NotFound(c, "project not found")
		case errors.Is(err, service.ErrInvalidUpload):
			BadRequest(c, err.Error())
		default:
			InternalError(c, "failed to presign upload")
		}
		return
	}
	Created(c, gin.H{"uploadUrl": uploadURL, "assetId": asset.ID, "asset": asset})
}

// ConfirmAssetReq 确认上传完成请求。
type ConfirmAssetReq struct {
	AssetID uint `json:"assetId" binding:"required"`
}

// Confirm POST /api/projects/:id/assets/confirm（工单 B06）
func (h *AssetHandler) Confirm(c *gin.Context) {
	if _, ok := parseIDParam(c); !ok {
		return
	}
	var req ConfirmAssetReq
	if err := c.ShouldBindJSON(&req); err != nil {
		BadRequest(c, "invalid request body")
		return
	}
	asset, err := h.uploads.Confirm(req.AssetID, currentUserID(c))
	if err != nil {
		switch {
		case errors.Is(err, service.ErrAssetNotFound):
			NotFound(c, "asset not found")
		case errors.Is(err, service.ErrInvalidState):
			Conflict(c, "asset not in uploading state")
		case errors.Is(err, service.ErrObjectMissing):
			BadRequest(c, "uploaded object not found")
		case errors.Is(err, service.ErrInvalidUpload):
			BadRequest(c, err.Error())
		default:
			InternalError(c, "failed to confirm upload")
		}
		return
	}
	h.uploads.DecorateThumbnail(asset)
	h.uploads.DecoratePlayback(asset)
	OK(c, gin.H{"asset": asset})
}

// Delete DELETE /api/assets/:id
func (h *AssetHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		BadRequest(c, "invalid asset id")
		return
	}
	userID, _ := c.Get("user_id")
	uid, _ := userID.(uint)

	if err := h.assetService.DeleteAsset(uint(id), uid); err != nil {
		if err.Error() == "asset not found" {
			NotFound(c, "asset not found")
			return
		}
		InternalError(c, "failed to delete asset")
		return
	}
	c.JSON(http.StatusNoContent, gin.H{})
}

// MockAssets returns the initial mock asset list for mock mode.
// 每个 seed 项目都配 2~3 条视频素材（Web 媒体面板按项目展示，缺了会显示空态）
// 缩略图地址指向同目录下的 *_thumb.jpg，由 DecorateThumbnail 自动转为可访问 URL
func MockAssets() []model.Asset {
	now := time.Now()
	video := func(id uint, projectID uint, file string, dur float64, w, h int, size int64, ago time.Duration) model.Asset {
		base := strings.TrimSuffix(file, ".mp4")
		return model.Asset{
			ID: id, ProjectID: projectID, Type: "video", StoragePath: "/mock/" + file, FileName: file,
			FileSize: size, Duration: dur, Width: w, Height: h, CreatedAt: now.Add(-ago),
			ThumbnailURL: "mock/" + base + "_thumb.jpg",
		}
	}
	return []model.Asset{
		// 项目 1：NYC Travel Vlog
		video(1, 1, "nyc_bridge.mp4", 15.2, 1920, 1080, 52428800, 10*time.Minute),
		video(2, 1, "times_square.mp4", 22.5, 1920, 1080, 73400000, 9*time.Minute),
		video(3, 1, "central_park.mp4", 12.8, 1920, 1080, 41943000, 8*time.Minute),
		// 项目 2：Product Teaser
		video(4, 2, "product_closeup.mp4", 10.4, 1920, 1080, 36700160, 7*time.Minute),
		video(5, 2, "product_lifestyle.mp4", 16.8, 1920, 1080, 49283072, 6*time.Minute),
		// 项目 3：Beach Day Reel（竖屏）
		video(6, 3, "beach_waves.mp4", 14.6, 1080, 1920, 31457280, 5*time.Minute),
		video(7, 3, "sunset_shore.mp4", 20.2, 1080, 1920, 48235520, 4*time.Minute),
		video(8, 3, "beach_crowd.mp4", 11.9, 1080, 1920, 42949673, 3*time.Minute),
	}
}
