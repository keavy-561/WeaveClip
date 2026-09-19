package repository

import (
	"sync"

	"github.com/weaveclip/server/internal/model"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// TimelineRepository 时间线版本数据访问（多版本设计，D3 裁定）。
type TimelineRepository interface {
	ListVersions(projectID uint) ([]model.Timeline, error)
	GetVersion(projectID uint, version int) (*model.Timeline, error)
	Create(timeline *model.Timeline) error
	// CreateNextVersion 在事务内分配 version = max+1 并插入（工单 WO8-11），
	// 消除"查最大版本后插入"的 check-then-act 竞态。
	CreateNextVersion(projectID uint, raw []byte, label string) (*model.Timeline, error)
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

// CreateNextVersion 事务 + 项目级 advisory lock 串行化版本号分配（工单 WO8-11）。
func (r *gormTimelineRepo) CreateNextVersion(projectID uint, raw []byte, label string) (*model.Timeline, error) {
	var created *model.Timeline
	err := r.db.Transaction(func(tx *gorm.DB) error {
		// 事务级 advisory lock：并发 PUT/chat/generate 在此处排队，版本号严格递增
		if err := tx.Exec("SELECT pg_advisory_xact_lock(?)", projectID).Error; err != nil {
			return err
		}
		var maxVersion int
		if err := tx.Model(&model.Timeline{}).
			Where("project_id = ?", projectID).
			Select("COALESCE(MAX(version), 0)").
			Scan(&maxVersion).Error; err != nil {
			return err
		}
		timeline := &model.Timeline{
			ProjectID:    projectID,
			Version:      maxVersion + 1,
			TimelineJSON: datatypes.JSON(raw),
			Label:        label,
		}
		if err := tx.Create(timeline).Error; err != nil {
			return err
		}
		created = timeline
		return nil
	})
	if err != nil {
		return nil, err
	}
	return created, nil
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

// CreateNextVersion mock 实现：锁内计算 max+1，语义与 gorm 版本一致（工单 WO8-11）。
func (r *mockTimelineRepo) CreateNextVersion(projectID uint, raw []byte, label string) (*model.Timeline, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	next := 1
	for i := range r.timelines {
		if r.timelines[i].ProjectID == projectID && r.timelines[i].Version >= next {
			next = r.timelines[i].Version + 1
		}
	}
	timeline := &model.Timeline{
		ID:           r.nextID,
		ProjectID:    projectID,
		Version:      next,
		TimelineJSON: datatypes.JSON(raw),
		Label:        label,
	}
	r.nextID++
	r.timelines = append(r.timelines, *timeline)
	return timeline, nil
}
