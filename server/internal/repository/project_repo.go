package repository

import (
	"sync"

	"github.com/weaveclip/server/internal/database"
	"github.com/weaveclip/server/internal/model"
	"gorm.io/gorm"
)

// ProjectRepository 项目数据访问接口。
type ProjectRepository interface {
	ListByUser(userID uint) ([]model.Project, error)
	Get(id uint) (*model.Project, error)
	Create(project *model.Project) error
	Update(project *model.Project) error
	Delete(id uint) error
}

// ---- GORM 实现 ----

type gormProjectRepo struct {
	db *gorm.DB
}

// NewGormProjectRepo 创建基于 GORM 的项目仓库。
func NewGormProjectRepo(db *gorm.DB) ProjectRepository {
	return &gormProjectRepo{db: db}
}

func (r *gormProjectRepo) ListByUser(userID uint) ([]model.Project, error) {
	var projects []model.Project
	if err := r.db.Where("user_id = ?", userID).Order("updated_at DESC").Find(&projects).Error; err != nil {
		return nil, err
	}
	return projects, nil
}

func (r *gormProjectRepo) Get(id uint) (*model.Project, error) {
	var project model.Project
	if err := r.db.First(&project, id).Error; err != nil {
		return nil, err
	}
	return &project, nil
}

func (r *gormProjectRepo) Create(project *model.Project) error {
	return r.db.Create(project).Error
}

func (r *gormProjectRepo) Update(project *model.Project) error {
	return r.db.Save(project).Error
}

func (r *gormProjectRepo) Delete(id uint) error {
	return r.db.Delete(&model.Project{}, id).Error
}

// ---- Mock 实现（进程内共享存储，MOCK_MODE 与单测共用） ----

var (
	mockProjectMu    sync.RWMutex
	mockProjectStore []model.Project
	mockProjectOnce  sync.Once
)

func initMockProjectStore() {
	mockProjectStore = database.MockProjects()
}

// MockProjectRepo 基于进程内切片的项目仓库实现。
type MockProjectRepo struct{}

// NewMockProjectRepo 创建 mock 项目仓库（所有实例共享同一份进程内数据）。
func NewMockProjectRepo() *MockProjectRepo {
	return &MockProjectRepo{}
}

// ResetMockProjectStore 清空并重置 mock 数据（测试用，模拟进程重启）。
func ResetMockProjectStore() {
	mockProjectOnce = sync.Once{}
	mockProjectMu.Lock()
	defer mockProjectMu.Unlock()
	mockProjectStore = nil
}

// AddMockProject 直接向 mock 存储追加项目（测试与预置数据用）。
func AddMockProject(project model.Project) {
	mockProjectOnce.Do(initMockProjectStore)
	mockProjectMu.Lock()
	defer mockProjectMu.Unlock()
	mockProjectStore = append(mockProjectStore, project)
}

// FilterMockProjectsByUser 按属主过滤 mock 项目。
func FilterMockProjectsByUser(userID uint) []model.Project {
	mockProjectOnce.Do(initMockProjectStore)
	mockProjectMu.RLock()
	defer mockProjectMu.RUnlock()
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

func (r *MockProjectRepo) ListByUser(userID uint) ([]model.Project, error) {
	return FilterMockProjectsByUser(userID), nil
}

func (r *MockProjectRepo) Get(id uint) (*model.Project, error) {
	mockProjectOnce.Do(initMockProjectStore)
	mockProjectMu.RLock()
	defer mockProjectMu.RUnlock()
	for _, p := range mockProjectStore {
		if p.ID == id {
			cpy := p
			return &cpy, nil
		}
	}
	return nil, gorm.ErrRecordNotFound
}

func (r *MockProjectRepo) Create(project *model.Project) error {
	mockProjectOnce.Do(initMockProjectStore)
	mockProjectMu.Lock()
	defer mockProjectMu.Unlock()
	if project.ID == 0 {
		var maxID uint
		for _, p := range mockProjectStore {
			if p.ID > maxID {
				maxID = p.ID
			}
		}
		project.ID = maxID + 1
	}
	mockProjectStore = append(mockProjectStore, *project)
	return nil
}

func (r *MockProjectRepo) Update(project *model.Project) error {
	mockProjectOnce.Do(initMockProjectStore)
	mockProjectMu.Lock()
	defer mockProjectMu.Unlock()
	for i := range mockProjectStore {
		if mockProjectStore[i].ID == project.ID {
			mockProjectStore[i] = *project
			return nil
		}
	}
	return gorm.ErrRecordNotFound
}

func (r *MockProjectRepo) Delete(id uint) error {
	mockProjectOnce.Do(initMockProjectStore)
	mockProjectMu.Lock()
	defer mockProjectMu.Unlock()
	for i, p := range mockProjectStore {
		if p.ID == id {
			mockProjectStore = append(mockProjectStore[:i], mockProjectStore[i+1:]...)
			return nil
		}
	}
	return gorm.ErrRecordNotFound
}
