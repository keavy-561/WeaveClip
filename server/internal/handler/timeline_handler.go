package handler

import (
	"errors"
	"io"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/weaveclip/server/internal/service"
)

// TimelineHandler 时间线版本端点（工单 B09）。
type TimelineHandler struct {
	timelines *service.TimelineService
}

// NewTimelineHandler 创建时间线处理器。
func NewTimelineHandler(timelines *service.TimelineService) *TimelineHandler {
	return &TimelineHandler{timelines: timelines}
}

// respondTimelineError 统一错误映射。
func respondTimelineError(c *gin.Context, err error, action string) {
	switch {
	case errors.Is(err, service.ErrProjectNotFound):
		NotFound(c, "project not found")
	case errors.Is(err, service.ErrTimelineNotFound):
		NotFound(c, "timeline not found")
	case errors.Is(err, service.ErrInvalidTimeline):
		BadRequest(c, err.Error())
	default:
		InternalError(c, action)
	}
}

// Get GET /api/projects/:id/timeline[?version=N]
func (h *TimelineHandler) Get(c *gin.Context) {
	projectID, ok := parseIDParam(c)
	if !ok {
		return
	}
	userID := currentUserID(c)
	if v := c.Query("version"); v != "" {
		version, err := strconv.Atoi(v)
		if err != nil || version <= 0 {
			BadRequest(c, "invalid version")
			return
		}
		timeline, err := h.timelines.GetVersion(projectID, userID, version)
		if err != nil {
			respondTimelineError(c, err, "failed to get timeline version")
			return
		}
		OK(c, gin.H{"timeline": timeline})
		return
	}
	timeline, err := h.timelines.GetLatest(projectID, userID)
	if err != nil {
		respondTimelineError(c, err, "failed to get timeline")
		return
	}
	OK(c, gin.H{"timeline": timeline})
}

// ListVersions GET /api/projects/:id/timeline/versions（Phase 6 Version History）
func (h *TimelineHandler) ListVersions(c *gin.Context) {
	projectID, ok := parseIDParam(c)
	if !ok {
		return
	}
	versions, err := h.timelines.ListVersions(projectID, currentUserID(c))
	if err != nil {
		respondTimelineError(c, err, "failed to list timeline versions")
		return
	}
	OK(c, gin.H{"versions": versions})
}

// Save PUT /api/projects/:id/timeline —— 请求体即 Video DSL JSON 对象。
func (h *TimelineHandler) Save(c *gin.Context) {
	projectID, ok := parseIDParam(c)
	if !ok {
		return
	}
	raw, err := io.ReadAll(io.LimitReader(c.Request.Body, 8<<20)) // DSL 上限 8MB
	if err != nil {
		BadRequest(c, "failed to read request body")
		return
	}
	label := c.GetHeader("X-Timeline-Label")
	timeline, err := h.timelines.Save(projectID, currentUserID(c), raw, label)
	if err != nil {
		respondTimelineError(c, err, "failed to save timeline")
		return
	}
	c.JSON(http.StatusCreated, gin.H{"timeline": timeline})
}
