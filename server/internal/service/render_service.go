package service

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/weaveclip/server/internal/model"
	"github.com/weaveclip/server/internal/queue"
	"github.com/weaveclip/server/internal/repository"
)

// RenderService 渲染任务编排（工单 B18）。
type RenderService struct {
	renders   repository.RenderRepository
	projects  ProjectFinder
	timelines *TimelineService
	assets    repository.AssetRepository
	q         *queue.Queue
}

// NewRenderService 创建渲染服务。
func NewRenderService(renders repository.RenderRepository, projects ProjectFinder,
	timelines *TimelineService, assets repository.AssetRepository, q *queue.Queue) *RenderService {
	return &RenderService{renders: renders, projects: projects, timelines: timelines, assets: assets, q: q}
}

// StartRender 取项目最新时间线创建渲染任务并入队。
func (s *RenderService) StartRender(projectID, userID uint, format, resolution string, fps int) (*model.Render, error) {
	if _, err := s.projects.GetProject(projectID, userID); err != nil {
		return nil, ErrProjectNotFound
	}
	latest, err := s.timelines.GetLatest(projectID, userID)
	if err != nil {
		if err == ErrTimelineNotFound {
			return nil, ErrTimelineNotFound
		}
		return nil, err
	}
	if format == "" {
		format = "mp4"
	}
	if resolution == "" {
		resolution = "1080x1920"
	}
	if fps <= 0 {
		fps = 30
	}
	render := &model.Render{
		ProjectID:  projectID,
		Format:     format,
		Resolution: resolution,
		FPS:        fps,
		Status:     "pending",
	}
	if err := s.renders.Create(render); err != nil {
		return nil, err
	}
	// 素材存储 key 快照：worker 经 storage 下载
	assetKeys := map[string]string{}
	if all, err := s.assets.ListByProject(projectID); err == nil {
		for _, a := range all {
			assetKeys[fmt.Sprintf("%d", a.ID)] = a.StoragePath
		}
	}
	taskID, err := s.q.Enqueue(context.Background(), queue.TypeRender, map[string]any{
		"renderId":        render.ID,
		"projectId":       projectID,
		"timelineVersion": latest.Version,
		"resolution":      resolution,
		"fps":             fps,
		"timelineJson":    json.RawMessage(latest.TimelineJSON),
		"assetKeys":       assetKeys,
	})
	if err != nil {
		render.Status = "failed"
		render.Error = err.Error()
		_ = s.renders.Update(render)
		return nil, err
	}
	_ = taskID // renders 表未存 task_id（task_results 承担轨迹），保留入队返回值占位
	render.Status = "queued"
	if err := s.renders.Update(render); err != nil {
		return nil, err
	}
	return render, nil
}

// GetRender 查询渲染任务（属主校验）。
func (s *RenderService) GetRender(id, userID uint) (*model.Render, error) {
	render, err := s.renders.Get(id)
	if err != nil {
		return nil, ErrTaskNotFound
	}
	if _, err := s.projects.GetProject(render.ProjectID, userID); err != nil {
		return nil, ErrTaskNotFound
	}
	return render, nil
}

// LoadTimelineJSON 供渲染任务加载指定版本时间线（内部调用，已在上层校验属主）。
func (s *RenderService) LoadTimelineJSON(projectID uint, version int) (json.RawMessage, error) {
	timeline, err := s.timelines.GetVersionInternal(projectID, version)
	if err != nil {
		return nil, err
	}
	return json.RawMessage(timeline.TimelineJSON), nil
}
