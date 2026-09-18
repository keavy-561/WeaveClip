package repository

import (
	"sync"

	"github.com/weaveclip/server/internal/model"
	"gorm.io/gorm"
)

// TaskResultRepository 异步任务轨迹数据访问（002 迁移的 task_results 表）。
type TaskResultRepository interface {
	Get(id uint) (*model.TaskResult, error)
	Create(task *model.TaskResult) error
	Update(task *model.TaskResult) error
	LatestByProject(projectID uint, taskType string) (*model.TaskResult, error)
}

// ---- GORM 实现 ----

type gormTaskResultRepo struct{ db *gorm.DB }

// NewGormTaskResultRepo 创建 GORM 任务仓库。
func NewGormTaskResultRepo(db *gorm.DB) TaskResultRepository {
	return &gormTaskResultRepo{db: db}
}

func (r *gormTaskResultRepo) Get(id uint) (*model.TaskResult, error) {
	var task model.TaskResult
	if err := r.db.First(&task, id).Error; err != nil {
		return nil, err
	}
	return &task, nil
}

func (r *gormTaskResultRepo) Create(task *model.TaskResult) error {
	return r.db.Create(task).Error
}

func (r *gormTaskResultRepo) Update(task *model.TaskResult) error {
	return r.db.Save(task).Error
}

func (r *gormTaskResultRepo) LatestByProject(projectID uint, taskType string) (*model.TaskResult, error) {
	var task model.TaskResult
	if err := r.db.Where("project_id = ? AND task_type = ?", projectID, taskType).
		Order("id DESC").First(&task).Error; err != nil {
		return nil, err
	}
	return &task, nil
}

// ---- Mock 实现 ----

type mockTaskResultRepo struct {
	mu    sync.RWMutex
	tasks []model.TaskResult
	next  uint
}

// NewMockTaskResultRepo 创建进程内 mock 任务仓库。
func NewMockTaskResultRepo() TaskResultRepository {
	return &mockTaskResultRepo{next: 1}
}

func (r *mockTaskResultRepo) Get(id uint) (*model.TaskResult, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for _, t := range r.tasks {
		if t.ID == id {
			cpy := t
			return &cpy, nil
		}
	}
	return nil, gorm.ErrRecordNotFound
}

func (r *mockTaskResultRepo) Create(task *model.TaskResult) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	task.ID = r.next
	r.next++
	r.tasks = append(r.tasks, *task)
	return nil
}

func (r *mockTaskResultRepo) Update(task *model.TaskResult) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	for i := range r.tasks {
		if r.tasks[i].ID == task.ID {
			r.tasks[i] = *task
			return nil
		}
	}
	return gorm.ErrRecordNotFound
}

func (r *mockTaskResultRepo) LatestByProject(projectID uint, taskType string) (*model.TaskResult, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var latest *model.TaskResult
	for i := range r.tasks {
		t := &r.tasks[i]
		if t.ProjectID == projectID && t.TaskType == taskType {
			if latest == nil || t.ID > latest.ID {
				latest = t
			}
		}
	}
	if latest == nil {
		return nil, gorm.ErrRecordNotFound
	}
	cpy := *latest
	return &cpy, nil
}
