package service

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/weaveclip/server/internal/model"
	"github.com/weaveclip/server/internal/repository"
)

// ErrTimelineNotFound 时间线不存在。
var ErrTimelineNotFound = errors.New("timeline not found")

// ErrInvalidTimeline 时间线 JSON 不合法。
var ErrInvalidTimeline = errors.New("invalid timeline json")

// TimelineService 时间线版本业务逻辑：属主校验、版本递增、JSON 校验。
type TimelineService struct {
	timelines repository.TimelineRepository
	proj      ProjectFinder
}

// NewTimelineService 创建时间线服务。
func NewTimelineService(timelines repository.TimelineRepository, proj ProjectFinder) *TimelineService {
	return &TimelineService{timelines: timelines, proj: proj}
}

// GetLatest 返回项目最新版本时间线。
func (s *TimelineService) GetLatest(projectID, userID uint) (*model.Timeline, error) {
	if _, err := s.proj.GetProject(projectID, userID); err != nil {
		return nil, ErrProjectNotFound
	}
	versions, err := s.timelines.ListVersions(projectID)
	if err != nil {
		return nil, err
	}
	if len(versions) == 0 {
		return nil, ErrTimelineNotFound
	}
	return &versions[0], nil
}

// GetVersion 返回指定版本时间线。
func (s *TimelineService) GetVersion(projectID, userID uint, version int) (*model.Timeline, error) {
	if _, err := s.proj.GetProject(projectID, userID); err != nil {
		return nil, ErrProjectNotFound
	}
	timeline, err := s.timelines.GetVersion(projectID, version)
	if err != nil {
		return nil, ErrTimelineNotFound
	}
	return timeline, nil
}

// ListVersions 返回全部版本（Phase 6 Version History 直接消费）。
func (s *TimelineService) ListVersions(projectID, userID uint) ([]model.Timeline, error) {
	if _, err := s.proj.GetProject(projectID, userID); err != nil {
		return nil, ErrProjectNotFound
	}
	return s.timelines.ListVersions(projectID)
}

// Save 保存新的时间线版本（每次 PUT 产生 version+1 的新行）。
func (s *TimelineService) Save(projectID, userID uint, raw []byte, label string) (*model.Timeline, error) {
	if _, err := s.proj.GetProject(projectID, userID); err != nil {
		return nil, ErrProjectNotFound
	}
	return s.SaveInternal(projectID, raw, label)
}

// SaveInternal 内部落库（生成/对话管线内部使用，已在上层做过属主校验）。
func (s *TimelineService) SaveInternal(projectID uint, raw []byte, label string) (*model.Timeline, error) {
	if err := validateTimelineJSON(raw); err != nil {
		return nil, err
	}
	versions, err := s.timelines.ListVersions(projectID)
	if err != nil {
		return nil, err
	}
	next := 1
	for _, t := range versions {
		if t.Version >= next {
			next = t.Version + 1
		}
	}
	timeline := &model.Timeline{
		ProjectID:    projectID,
		Version:      next,
		TimelineJSON: json.RawMessage(raw),
		Label:        label,
	}
	if err := s.timelines.Create(timeline); err != nil {
		return nil, err
	}
	return timeline, nil
}

// validateTimelineJSON 校验请求体是合法 JSON 对象（Video DSL 的最小约束）。
func validateTimelineJSON(raw []byte) error {
	trimmed := bytes.TrimSpace(raw)
	if len(trimmed) == 0 || trimmed[0] != '{' {
		return fmt.Errorf("%w: expected JSON object", ErrInvalidTimeline)
	}
	if !json.Valid(trimmed) {
		return fmt.Errorf("%w: malformed json", ErrInvalidTimeline)
	}
	return nil
}
