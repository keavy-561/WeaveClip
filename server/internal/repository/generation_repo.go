package repository

import (
	"sync"

	"github.com/weaveclip/server/internal/model"
	"gorm.io/gorm"
)

// GenerationRepository 生成记录数据访问。
type GenerationRepository interface {
	Get(id uint) (*model.Generation, error)
	Create(gen *model.Generation) error
	Update(gen *model.Generation) error
}

// ---- GORM 实现 ----

type gormGenerationRepo struct{ db *gorm.DB }

// NewGormGenerationRepo 创建 GORM 生成记录仓库。
func NewGormGenerationRepo(db *gorm.DB) GenerationRepository {
	return &gormGenerationRepo{db: db}
}

func (r *gormGenerationRepo) Get(id uint) (*model.Generation, error) {
	var gen model.Generation
	if err := r.db.First(&gen, id).Error; err != nil {
		return nil, err
	}
	return &gen, nil
}

func (r *gormGenerationRepo) Create(gen *model.Generation) error {
	return r.db.Create(gen).Error
}

func (r *gormGenerationRepo) Update(gen *model.Generation) error {
	return r.db.Save(gen).Error
}

// ---- Mock 实现 ----

type mockGenerationRepo struct {
	mu   sync.RWMutex
	gens []model.Generation
	next uint
}

// NewMockGenerationRepo 创建进程内 mock 生成记录仓库。
func NewMockGenerationRepo() GenerationRepository {
	return &mockGenerationRepo{next: 1}
}

func (r *mockGenerationRepo) Get(id uint) (*model.Generation, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for _, g := range r.gens {
		if g.ID == id {
			cpy := g
			return &cpy, nil
		}
	}
	return nil, gorm.ErrRecordNotFound
}

func (r *mockGenerationRepo) Create(gen *model.Generation) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	gen.ID = r.next
	r.next++
	r.gens = append(r.gens, *gen)
	return nil
}

func (r *mockGenerationRepo) Update(gen *model.Generation) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	for i := range r.gens {
		if r.gens[i].ID == gen.ID {
			r.gens[i] = *gen
			return nil
		}
	}
	return gorm.ErrRecordNotFound
}

// EditRepository 编辑操作记录数据访问。

type EditRepository interface {
	Create(edit *model.Edit) error
	ListByProject(projectID uint, limit int) ([]model.Edit, error)
}

type gormEditRepo struct{ db *gorm.DB }

// NewGormEditRepo 创建 GORM 编辑记录仓库。
func NewGormEditRepo(db *gorm.DB) EditRepository {
	return &gormEditRepo{db: db}
}

func (r *gormEditRepo) Create(edit *model.Edit) error {
	return r.db.Create(edit).Error
}

func (r *gormEditRepo) ListByProject(projectID uint, limit int) ([]model.Edit, error) {
	var edits []model.Edit
	q := r.db.Where("project_id = ?", projectID).Order("created_at DESC")
	if limit > 0 {
		q = q.Limit(limit)
	}
	if err := q.Find(&edits).Error; err != nil {
		return nil, err
	}
	return edits, nil
}

type mockEditRepo struct {
	mu    sync.RWMutex
	edits []model.Edit
	next  uint
}

// NewMockEditRepo 创建进程内 mock 编辑记录仓库。
func NewMockEditRepo() EditRepository {
	return &mockEditRepo{next: 1}
}

func (r *mockEditRepo) Create(edit *model.Edit) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	edit.ID = r.next
	r.next++
	r.edits = append(r.edits, *edit)
	return nil
}

func (r *mockEditRepo) ListByProject(projectID uint, limit int) ([]model.Edit, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var result []model.Edit
	for _, e := range r.edits {
		if e.ProjectID == projectID {
			result = append(result, e)
		}
	}
	if limit > 0 && len(result) > limit {
		result = result[:limit]
	}
	return result, nil
}
