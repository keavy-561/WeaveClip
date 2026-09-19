package service

import (
	"context"
	"errors"

	"github.com/weaveclip/server/internal/model"
	"github.com/weaveclip/server/internal/queue"
	"github.com/weaveclip/server/internal/repository"
)

// ErrTaskNotFound 分析任务不存在。
var ErrTaskNotFound = errors.New("task not found")

// AnalyzeService 素材分析任务编排（工单 B15）。
type AnalyzeService struct {
	tasks    repository.TaskResultRepository
	projects ProjectFinder
	assets   repository.AssetRepository
	q        *queue.Queue
}

// NewAnalyzeService 创建分析服务。
func NewAnalyzeService(tasks repository.TaskResultRepository, projects ProjectFinder,
	assets repository.AssetRepository, q *queue.Queue) *AnalyzeService {
	return &AnalyzeService{tasks: tasks, projects: projects, assets: assets, q: q}
}

// Start 创建分析任务并入队；返回带 analysisId 的任务记录。
func (s *AnalyzeService) Start(projectID, userID uint, assetIDs []uint) (*model.TaskResult, error) {
	if _, err := s.projects.GetProject(projectID, userID); err != nil {
		return nil, ErrProjectNotFound
	}
	all, err := s.assets.ListByProject(projectID)
	if err != nil {
		return nil, err
	}
	belongs := map[uint]bool{}
	videoCount := 0
	for _, a := range all {
		belongs[a.ID] = true
		if a.Type == "video" {
			videoCount++
		}
	}
	if videoCount == 0 {
		return nil, ErrNoAssets
	}
	ids := assetIDs
	if len(ids) == 0 {
		// 缺省分析全部视频素材
		for _, a := range all {
			if a.Type == "video" {
				ids = append(ids, a.ID)
			}
		}
	}
	for _, id := range ids {
		if !belongs[id] {
			return nil, ErrAssetNotFound
		}
	}

	task := &model.TaskResult{TaskType: "analyze", ProjectID: projectID, Status: "pending"}
	if err := s.tasks.Create(task); err != nil {
		return nil, err
	}
	taskID, err := s.q.Enqueue(context.Background(), queue.TypeAnalyze, map[string]any{
		"taskResultId": task.ID,
		"projectId":    projectID,
		"assetIds":     ids,
	})
	if err != nil {
		task.Status = "failed"
		task.Error = err.Error()
		_ = s.tasks.Update(task)
		return nil, err
	}
	task.TaskID = taskID
	if err := s.tasks.Update(task); err != nil {
		return nil, err
	}
	return task, nil
}

// ListAssetsForResults 结果聚合用：列出项目素材（属主校验）。
func (s *AnalyzeService) ListAssetsForResults(projectID, userID uint) ([]model.Asset, error) {
	if _, err := s.projects.GetProject(projectID, userID); err != nil {
		return nil, ErrProjectNotFound
	}
	return s.assets.ListByProject(projectID)
}

// GetAnalysis 查询分析任务状态与结果（属主校验）。
func (s *AnalyzeService) GetAnalysis(projectID, userID, analysisID uint) (*model.TaskResult, error) {
	if _, err := s.projects.GetProject(projectID, userID); err != nil {
		return nil, ErrProjectNotFound
	}
	var task *model.TaskResult
	var err error
	if analysisID > 0 {
		task, err = s.tasks.Get(analysisID)
	} else {
		task, err = s.tasks.LatestByProject(projectID, "analyze")
	}
	if err != nil {
		return nil, ErrTaskNotFound
	}
	if task.ProjectID != projectID {
		return nil, ErrTaskNotFound
	}
	return task, nil
}
