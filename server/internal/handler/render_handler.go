package handler

import (
	"errors"
	"fmt"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/weaveclip/server/internal/service"
	"github.com/weaveclip/server/internal/storage"
)

// RenderHandler 渲染导出端点（工单 B18）。
type RenderHandler struct {
	renders *service.RenderService
	store   storage.Storage
}

// NewRenderHandler 创建渲染处理器。
func NewRenderHandler(renders *service.RenderService, store storage.Storage) *RenderHandler {
	return &RenderHandler{renders: renders, store: store}
}

type StartRenderReq struct {
	Format     string `json:"format"`
	Resolution string `json:"resolution"`
	FPS        int    `json:"fps"`
}

// Start POST /api/projects/:id/render
func (h *RenderHandler) Start(c *gin.Context) {
	projectID, ok := parseIDParam(c)
	if !ok {
		return
	}
	var req StartRenderReq
	if err := c.ShouldBindJSON(&req); err != nil {
		BadRequest(c, "invalid request body")
		return
	}
	render, err := h.renders.StartRender(projectID, currentUserID(c), req.Format, req.Resolution, req.FPS)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrProjectNotFound):
			NotFound(c, "project not found")
		case errors.Is(err, service.ErrTimelineNotFound):
			BadRequest(c, "project has no timeline to render")
		default:
			InternalError(c, "failed to start render")
		}
		return
	}
	Created(c, gin.H{"renderId": render.ID, "status": render.Status})
}

// Get GET /api/renders/:id
func (h *RenderHandler) Get(c *gin.Context) {
	id, ok := parseIDParam(c)
	if !ok {
		return
	}
	render, err := h.renders.GetRender(id, currentUserID(c))
	if err != nil {
		if errors.Is(err, service.ErrTaskNotFound) {
			NotFound(c, "render not found")
			return
		}
		InternalError(c, "failed to get render")
		return
	}
	// 现签下载 URL：落库的 24h 预签名会过期，completed 状态每次 GET 重新签发短时效地址（工单 WO8-20）
	if render.Status == "completed" && h.store != nil {
		if url, signErr := h.store.PresignGet(c.Request.Context(), fmt.Sprintf("renders/%d.mp4", id), time.Hour); signErr == nil {
			render.DownloadURL = url
		}
	}
	resp := gin.H{
		"renderId":   render.ID,
		"projectId":  render.ProjectID,
		"status":     render.Status,
		"progress":   render.Progress,
		"format":     render.Format,
		"resolution": render.Resolution,
		"fps":        render.FPS,
	}
	if render.DownloadURL != "" {
		resp["downloadUrl"] = render.DownloadURL
	}
	if render.Error != "" {
		resp["error"] = render.Error
	}
	OK(c, resp)
}
