package handler

import (
	"fmt"
	"net/http"
	"strconv"
	"sync"
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

var (
	mockProjectStore []model.Project
	mockProjectOnce  sync.Once
)

func initMockProjectStore() {
	mockProjectStore = database.MockProjects()
}

func filterMockProjects(userID uint) []model.Project {
	mockProjectOnce.Do(initMockProjectStore)
	if userID == 0 {
		return nil
	}
	var result []model.Project
	for _, p := range mockProjectStore {
		if p.UserID == userID {
			result = append(result, p)
		}
	}
	return result
}

func addMockProject(project model.Project) {
	mockProjectOnce.Do(initMockProjectStore)
	mockProjectStore = append(mockProjectStore, project)
}

// Test helpers
func ResetMockProjectStoreForTest() {
	mockProjectStore = nil
	mockProjectOnce = sync.Once{}
}

func AddMockProjectForTest(project model.Project) {
	addMockProject(project)
}

func FilterMockProjectsForTest(userID uint) []model.Project {
	return filterMockProjects(userID)
}

type CreateProjectReq struct {
	Name        string `json:"name" binding:"required"`
	Duration    *int   `json:"duration"`
	AspectRatio string `json:"aspectRatio"`
	Style       string `json:"style"`
}

// List GET /api/projects
func (h *ProjectHandler) List(c *gin.Context) {
	userID, _ := c.Get("user_id")
	uid, _ := userID.(uint)

	if h.db == nil {
		projects := filterMockProjects(uid)
		OK(c, gin.H{"projects": projects})
		return
	}

	var projects []model.Project
	if err := h.db.Where("user_id = ?", uid).Order("updated_at DESC").Find(&projects).Error; err != nil {
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

	userID, _ := c.Get("user_id")
	uid, _ := userID.(uint)

	project := model.Project{
		Name:        req.Name,
		UserID:      uid,
		Status:      "draft",
		AspectRatio: defaultStr(req.AspectRatio, "9:16"),
		Style:       defaultStr(req.Style, "cinematic"),
	}
	if req.Duration != nil {
		project.Duration = *req.Duration
	}

	if h.db == nil {
		project.ID = uint(time.Now().Unix())
		addMockProject(project)
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

	userID, _ := c.Get("user_id")
	uid, _ := userID.(uint)

	if h.db == nil {
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
	if project.UserID != uid {
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

	userID, _ := c.Get("user_id")
	uid, _ := userID.(uint)

	if h.db == nil {
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
		c.JSON(http.StatusNoContent, gin.H{})
		return
	}

	var project model.Project
	if err := h.db.First(&project, id).Error; err != nil {
		NotFound(c, "project not found")
		return
	}
	if project.UserID != uid {
		NotFound(c, "project not found")
		return
	}
	if err := h.db.Delete(&model.Project{}, id).Error; err != nil {
		InternalError(c, "failed to delete project")
		return
	}
	c.Status(http.StatusNoContent)
}

func defaultStr(v, fallback string) string {
	if v == "" {
		return fallback
	}
	return v
}

// GetProject retrieves a project by ID and verifies ownership.
func (h *ProjectHandler) GetProject(id, userID uint) (*model.Project, error) {
	if h.db == nil {
		for _, p := range filterMockProjects(userID) {
			if p.ID == id {
				cpy := p
				return &cpy, nil
			}
		}
		return nil, fmt.Errorf("project not found")
	}
	var project model.Project
	if err := h.db.First(&project, id).Error; err != nil {
		return nil, err
	}
	if project.UserID != userID {
		return nil, fmt.Errorf("project not found")
	}
	return &project, nil
}
