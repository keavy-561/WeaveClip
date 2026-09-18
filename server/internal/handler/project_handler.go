package handler

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/weaveclip/server/internal/service"
)

// ProjectHandler 项目 CRUD（经 ProjectService，handler 不再直连数据库）。
type ProjectHandler struct {
	projects *service.ProjectService
}

// NewProjectHandler 创建项目处理器。
func NewProjectHandler(projects *service.ProjectService) *ProjectHandler {
	return &ProjectHandler{projects: projects}
}

// currentUserID 从上下文取出鉴权用户 ID。
func currentUserID(c *gin.Context) uint {
	v, _ := c.Get("user_id")
	uid, _ := v.(uint)
	return uid
}

// parseIDParam 解析路由 :id 参数，失败时写 400 响应。
func parseIDParam(c *gin.Context) (uint, bool) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		BadRequest(c, "invalid id")
		return 0, false
	}
	return uint(id), true
}

type CreateProjectReq struct {
	Name        string `json:"name" binding:"required"`
	Duration    *int   `json:"duration"`
	AspectRatio string `json:"aspectRatio"`
	Style       string `json:"style"`
}

// UpdateProjectReq 仅更新传入的非空字段。
type UpdateProjectReq struct {
	Name        *string `json:"name"`
	Status      *string `json:"status"`
	Duration    *int    `json:"duration"`
	AspectRatio *string `json:"aspectRatio"`
	Style       *string `json:"style"`
}

// respondProjectError 统一把服务层错误映射为 HTTP 响应。
func respondProjectError(c *gin.Context, err error, action string) {
	if errors.Is(err, service.ErrProjectNotFound) {
		NotFound(c, "project not found")
		return
	}
	InternalError(c, action)
}

// List GET /api/projects
func (h *ProjectHandler) List(c *gin.Context) {
	projects, err := h.projects.List(currentUserID(c))
	if err != nil {
		InternalError(c, "failed to list projects")
		return
	}
	OK(c, gin.H{"projects": projects})
}

// Create POST /api/projects
func (h *ProjectHandler) Create(c *gin.Context) {
	var req CreateProjectReq
	if err := c.ShouldBindJSON(&req); err != nil {
		BadRequest(c, "invalid request body")
		return
	}
	project, err := h.projects.Create(currentUserID(c), service.CreateProjectInput{
		Name:        req.Name,
		Duration:    req.Duration,
		AspectRatio: req.AspectRatio,
		Style:       req.Style,
	})
	if err != nil {
		InternalError(c, "failed to create project")
		return
	}
	Created(c, gin.H{"project": project})
}

// Get GET /api/projects/:id
func (h *ProjectHandler) Get(c *gin.Context) {
	id, ok := parseIDParam(c)
	if !ok {
		return
	}
	project, err := h.projects.GetProject(id, currentUserID(c))
	if err != nil {
		respondProjectError(c, err, "failed to get project")
		return
	}
	OK(c, gin.H{"project": project})
}

// Update PATCH /api/projects/:id
func (h *ProjectHandler) Update(c *gin.Context) {
	id, ok := parseIDParam(c)
	if !ok {
		return
	}
	var req UpdateProjectReq
	if err := c.ShouldBindJSON(&req); err != nil {
		BadRequest(c, "invalid request body")
		return
	}
	project, err := h.projects.Update(id, currentUserID(c), service.UpdateProjectInput{
		Name:        req.Name,
		Status:      req.Status,
		Duration:    req.Duration,
		AspectRatio: req.AspectRatio,
		Style:       req.Style,
	})
	if err != nil {
		respondProjectError(c, err, "failed to update project")
		return
	}
	OK(c, gin.H{"project": project})
}

// Delete DELETE /api/projects/:id
func (h *ProjectHandler) Delete(c *gin.Context) {
	id, ok := parseIDParam(c)
	if !ok {
		return
	}
	if err := h.projects.Delete(id, currentUserID(c)); err != nil {
		respondProjectError(c, err, "failed to delete project")
		return
	}
	c.Status(http.StatusNoContent)
}
