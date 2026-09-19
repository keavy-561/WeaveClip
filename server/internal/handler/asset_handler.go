package handler

import (
	"errors"
	"net/http"
	"strconv"
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
func MockAssets() []model.Asset {
	now := time.Now()
	return []model.Asset{
		{
			ID: 1, ProjectID: 1, Type: "video", StoragePath: "/mock/nyc_bridge.mp4", FileName: "nyc_bridge.mp4",
			FileSize: 52428800, Duration: 15.2, Width: 1920, Height: 1080, CreatedAt: now.Add(-10 * time.Minute),
		},
		{
			ID: 2, ProjectID: 1, Type: "video", StoragePath: "/mock/times_square.mp4", FileName: "times_square.mp4",
			FileSize: 73400000, Duration: 22.5, Width: 1920, Height: 1080, CreatedAt: now.Add(-9 * time.Minute),
		},
		{
			ID: 3, ProjectID: 1, Type: "video", StoragePath: "/mock/central_park.mp4", FileName: "central_park.mp4",
			FileSize: 41943000, Duration: 12.8, Width: 1920, Height: 1080, CreatedAt: now.Add(-8 * time.Minute),
		},
	}
}
