package handler

import (
	"encoding/json"
	"errors"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/weaveclip/server/internal/service"
)

// GenerateHandler 一句话生成端点（工单 B12）。
type GenerateHandler struct {
	generations *service.GenerateService
}

// NewGenerateHandler 创建生成处理器。
func NewGenerateHandler(generations *service.GenerateService) *GenerateHandler {
	return &GenerateHandler{generations: generations}
}

type StartGenerateReq struct {
	Prompt  string           `json:"prompt" binding:"required"`
	Answers []service.Answer `json:"answers"` // 澄清追问的回填
}

// Start POST /api/projects/:id/generate
func (h *GenerateHandler) Start(c *gin.Context) {
	projectID, ok := parseIDParam(c)
	if !ok {
		return
	}
	var req StartGenerateReq
	if err := c.ShouldBindJSON(&req); err != nil {
		BadRequest(c, "invalid request body")
		return
	}
	gen, err := h.generations.StartGeneration(projectID, currentUserID(c), req.Prompt, req.Answers)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrProjectNotFound):
			NotFound(c, "project not found")
		case errors.Is(err, service.ErrNoAssets):
			BadRequest(c, "no video assets in project, upload footage first")
		default:
			InternalError(c, "failed to start generation")
		}
		return
	}
	Created(c, gin.H{"generationId": gen.ID, "status": gen.Status})
}

// Get GET /api/generations/:id
func (h *GenerateHandler) Get(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		BadRequest(c, "invalid generation id")
		return
	}
	gen, err := h.generations.GetGeneration(uint(id), currentUserID(c))
	if err != nil {
		if errors.Is(err, service.ErrGenerationNotFound) {
			NotFound(c, "generation not found")
			return
		}
		InternalError(c, "failed to get generation")
		return
	}
	resp := gin.H{
		"generationId": gen.ID,
		"projectId":    gen.ProjectID,
		"status":       gen.Status,
		"prompt":       gen.Prompt,
		"createdAt":    gen.CreatedAt,
	}
	if gen.Error != "" {
		resp["error"] = gen.Error
	}
	if len(gen.Result) > 0 {
		var result map[string]any
		if err := json.Unmarshal(gen.Result, &result); err == nil {
			if q, ok := result["questions"]; ok {
				resp["questions"] = q
			}
			if dsl, ok := result["dsl"]; ok {
				resp["timeline"] = dsl
			}
			if v, ok := result["timelineVersion"]; ok {
				resp["timelineVersion"] = v
			}
		}
	}
	OK(c, resp)
}
