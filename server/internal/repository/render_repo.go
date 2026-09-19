package repository

import (
	"sync"

	"github.com/weaveclip/server/internal/model"
	"gorm.io/gorm"
)

// RenderRepository 渲染记录数据访问。
type RenderRepository interface {
	Get(id uint) (*model.Render, error)
	Create(render *model.Render) error
	Update(render *model.Render) error
	// UpdateProgress 只更新 progress 列且单调不减（GREATEST）：进度 goroutine 与
	// 主流程并发写同一行时避免整行覆盖与进度回退（工单 WO8-10）。
	UpdateProgress(id uint, progress int) error
}

// ---- GORM 实现 ----

type gormRenderRepo struct{ db *gorm.DB }

// NewGormRenderRepo 创建 GORM 渲染仓库。
func NewGormRenderRepo(db *gorm.DB) RenderRepository {
	return &gormRenderRepo{db: db}
}

func (r *gormRenderRepo) Get(id uint) (*model.Render, error) {
	var render model.Render
	if err := r.db.First(&render, id).Error; err != nil {
		return nil, err
	}
	return &render, nil
}

func (r *gormRenderRepo) Create(render *model.Render) error {
	return r.db.Create(render).Error
}

func (r *gormRenderRepo) Update(render *model.Render) error {
	return r.db.Save(render).Error
}

// UpdateProgress 单列更新 + GREATEST 保证进度单调（工单 WO8-10）。
func (r *gormRenderRepo) UpdateProgress(id uint, progress int) error {
	return r.db.Model(&model.Render{}).Where("id = ?", id).
		Update("progress", gorm.Expr("GREATEST(progress, ?)", progress)).Error
}

// ---- Mock 实现 ----

type mockRenderRepo struct {
	mu      sync.RWMutex
	renders []model.Render
	next    uint
}

// NewMockRenderRepo 创建进程内 mock 渲染仓库。
func NewMockRenderRepo() RenderRepository {
	return &mockRenderRepo{next: 1}
}

func (r *mockRenderRepo) Get(id uint) (*model.Render, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for _, x := range r.renders {
		if x.ID == id {
			cpy := x
			return &cpy, nil
		}
	}
	return nil, gorm.ErrRecordNotFound
}

func (r *mockRenderRepo) Create(render *model.Render) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	render.ID = r.next
	r.next++
	r.renders = append(r.renders, *render)
	return nil
}

func (r *mockRenderRepo) Update(render *model.Render) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	for i := range r.renders {
		if r.renders[i].ID == render.ID {
			r.renders[i] = *render
			return nil
		}
	}
	return gorm.ErrRecordNotFound
}

// UpdateProgress mock 实现：单调不减语义与 gorm 版本一致（工单 WO8-10）。
func (r *mockRenderRepo) UpdateProgress(id uint, progress int) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	for i := range r.renders {
		if r.renders[i].ID == id {
			if progress > r.renders[i].Progress {
				r.renders[i].Progress = progress
			}
			return nil
		}
	}
	return gorm.ErrRecordNotFound
}
