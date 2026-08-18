package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/weaveclip/server/internal/database"
	"github.com/weaveclip/server/internal/model"
)

// ProjectHandler 项目 CRUD
// Phase 0：DB 可用则走 GORM，不可用则返回 Mock 数据
type ProjectHandler struct {
	db *gorm.DB
}

func NewProjectHandler(db *gorm.DB) *ProjectHandler {
	return &ProjectHandler{db: db}
}

type CreateProjectReq struct {
	Name        string `json:"name" binding:"required"`
	Duration    *int   `json:"duration"`
	AspectRatio string `json:"aspectRatio"`
	Style       string `json:"style"`
}

// List GET /api/projects
func (h *ProjectHandler) List(c *gin.Context) {
	if h.db == nil {
		userID, _ := c.Get("user_id")
		uid, _ := userID.(uint)
		projects := filterMockProjects(uid)
		OK(c, gin.H{"projects": projects})
		return
	}

	var projects []model.Project
	if err := h.db.Order("updated_at DESC").Find(&projects).Error; err != nil {
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

	project := model.Project{
		Name:        req.Name,
		Status:      "draft",
		AspectRatio: defaultStr(req.AspectRatio, "9:16"),
		Style:       defaultStr(req.Style, "cinematic"),
	}
	if req.Duration != nil {
		project.Duration = *req.Duration
	}

	if h.db == nil {
		// Mock 模式：返回构造的对象（不入库）
		userID, _ := c.Get("user_id")
		uid, _ := userID.(uint)
		project.ID = uint(time.Now().Unix())
		project.UserID = uid
		Created(c, gin.H{"project": project})
		return
	}

	if err := h.db.Create(&project).Error; err != nil {
		InternalError(c, "failed to create project")
		return
	}
	Created(c, gin.H{"project": project})
}

// Get GET /api/projects/:id
func (h *ProjectHandler) Get(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		BadRequest(c, "invalid project id")
		return
	}

	if h.db == nil {
		userID, _ := c.Get("user_id")
		uid, _ := userID.(uint)
		for _, p := range filterMockProjects(uid) {
			if uint64(p.ID) == id {
				OK(c, gin.H{"project": p})
				return
			}
		}
		NotFound(c, "project not found")
		return
	}

	var project model.Project
	if err := h.db.First(&project, id).Error; err != nil {
		NotFound(c, "project not found")
		return
	}
	OK(c, gin.H{"project": project})
}

// Delete DELETE /api/projects/:id
func (h *ProjectHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		BadRequest(c, "invalid project id")
		return
	}

	if h.db == nil {
		userID, _ := c.Get("user_id")
		uid, _ := userID.(uint)
		found := false
		for _, p := range filterMockProjects(uid) {
			if uint64(p.ID) == id {
				found = true
				break
			}
		}
		if !found {
			NotFound(c, "project not found")
			return
		}
		c.Status(http.StatusNoContent)
		return
	}

	if err := h.db.Delete(&model.Project{}, id).Error; err != nil {
		InternalError(c, "failed to delete project")
		return
	}
	c.Status(http.StatusNoContent)
}

func filterMockProjects(userID uint) []model.Project {
	all := database.MockProjects()
	if userID == 0 {
		return nil
	}
	// In mock mode, only user 1 sees the seeded projects; others get empty list.
	if userID != 1 {
		return nil
	}
	for i := range all {
		all[i].UserID = userID
	}
	return all
}

func defaultStr(v, fallback string) string {
	if v == "" {
		return fallback
	}
	return v
}
