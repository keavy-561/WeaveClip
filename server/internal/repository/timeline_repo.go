package repository

import (
	"sync"

	"github.com/weaveclip/server/internal/model"
	"gorm.io/gorm"
)

// TimelineRepository 时间线版本数据访问（多版本设计，D3 裁定）。
type TimelineRepository interface {
	ListVersions(projectID uint) ([]model.Timeline, error)
	GetVersion(projectID uint, version int) (*model.Timeline, error)
	Create(timeline *model.Timeline) error
}

// ---- GORM 实现 ----

type gormTimelineRepo struct {
	db *gorm.DB
}

// NewGormTimelineRepo 创建基于 GORM 的时间线仓库。
func NewGormTimelineRepo(db *gorm.DB) TimelineRepository {
	return &gormTimelineRepo{db: db}
}

func (r *gormTimelineRepo) ListVersions(projectID uint) ([]model.Timeline, error) {
	var timelines []model.Timeline
	if err := r.db.Where("project_id = ?", projectID).
		Order("version DESC").Find(&timelines).Error; err != nil {
		return nil, err
	}
	return timelines, nil
}

func (r *gormTimelineRepo) GetVersion(projectID uint, version int) (*model.Timeline, error) {
	var timeline model.Timeline
	if err := r.db.Where("project_id = ? AND version = ?", projectID, version).
		First(&timeline).Error; err != nil {
		return nil, err
	}
	return &timeline, nil
}

func (r *gormTimelineRepo) Create(timeline *model.Timeline) error {
	return r.db.Create(timeline).Error
}

// ---- Mock 实现 ----

type mockTimelineRepo struct {
	mu        sync.RWMutex
	timelines []model.Timeline
	nextID    uint
}

// NewMockTimelineRepo 创建进程内 mock 时间线仓库。
func NewMockTimelineRepo() TimelineRepository {
	return &mockTimelineRepo{nextID: 1}
}

func (r *mockTimelineRepo) ListVersions(projectID uint) ([]model.Timeline, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var result []model.Timeline
	for _, t := range r.timelines {
		if t.ProjectID == projectID {
			result = append(result, t)
		}
	}
	// 版本倒序
	for i := 0; i < len(result); i++ {
		for j := i + 1; j < len(result); j++ {
			if result[j].Version > result[i].Version {
				result[i], result[j] = result[j], result[i]
			}
		}
	}
	return result, nil
}

func (r *mockTimelineRepo) GetVersion(projectID uint, version int) (*model.Timeline, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for _, t := range r.timelines {
		if t.ProjectID == projectID && t.Version == version {
			cpy := t
			return &cpy, nil
		}
	}
	return nil, gorm.ErrRecordNotFound
}

func (r *mockTimelineRepo) Create(timeline *model.Timeline) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	timeline.ID = r.nextID
	r.nextID++
	r.timelines = append(r.timelines, *timeline)
	return nil
}
