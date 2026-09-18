package handler

import (
	"encoding/json"
	"errors"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/weaveclip/server/internal/service"
)

// AnalyzeHandler 素材分析端点（工单 B15）。
type AnalyzeHandler struct {
	analyze *service.AnalyzeService
}

// NewAnalyzeHandler 创建分析处理器。
func NewAnalyzeHandler(analyze *service.AnalyzeService) *AnalyzeHandler {
	return &AnalyzeHandler{analyze: analyze}
}

type StartAnalyzeReq struct {
	AssetIDs []uint `json:"assetIds"` // 缺省分析项目下全部视频素材
}

// Start POST /api/projects/:id/analyze
func (h *AnalyzeHandler) Start(c *gin.Context) {
	projectID, ok := parseIDParam(c)
	if !ok {
		return
	}
	var req StartAnalyzeReq
	if len(c.Request.Body) > 0 {
		if err := c.ShouldBindJSON(&req); err != nil {
			BadRequest(c, "invalid request body")
			return
		}
	}
	task, err := h.analyze.Start(projectID, currentUserID(c), req.AssetIDs)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrProjectNotFound):
			NotFound(c, "project not found")
		case errors.Is(err, service.ErrNoAssets):
			BadRequest(c, "no video assets to analyze")
		case errors.Is(err, service.ErrAssetNotFound):
			NotFound(c, "asset not found in project")
		default:
			InternalError(c, "failed to start analyze")
		}
		return
	}
	Created(c, gin.H{"analysisId": task.ID, "status": task.Status})
}

// Status GET /api/projects/:id/analysis[?analysisId=N]
func (h *AnalyzeHandler) Status(c *gin.Context) {
	projectID, ok := parseIDParam(c)
	if !ok {
		return
	}
	var analysisID uint
	if v := c.Query("analysisId"); v != "" {
		parsed, err := strconv.ParseUint(v, 10, 64)
		if err != nil || parsed == 0 {
			BadRequest(c, "invalid analysisId")
			return
		}
		analysisID = uint(parsed)
	}
	task, err := h.analyze.GetAnalysis(projectID, currentUserID(c), analysisID)
	if err != nil {
		if errors.Is(err, service.ErrTaskNotFound) {
			NotFound(c, "analysis not found")
			return
		}
		InternalError(c, "failed to get analysis")
		return
	}

	// 聚合项目素材的 analysis JSONB
	assets, listErr := h.analyze.ListAssetsForResults(projectID, currentUserID(c))
	results := make([]gin.H, 0, len(assets))
	if listErr == nil {
		for i := range assets {
			a := &assets[i]
			if len(a.Analysis) == 0 {
				continue
			}
			var parsed map[string]any
			if err := json.Unmarshal(a.Analysis, &parsed); err != nil {
				continue
			}
			results = append(results, gin.H{"assetId": a.ID, "fileName": a.FileName, "analysis": parsed})
		}
	}

	resp := gin.H{"analysisId": task.ID, "status": task.Status, "progress": task.Progress, "results": results}
	if task.Error != "" {
		resp["error"] = task.Error
	}
	OK(c, resp)
}
