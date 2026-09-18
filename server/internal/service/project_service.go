package service

import (
	"errors"

	"github.com/weaveclip/server/internal/model"
	"github.com/weaveclip/server/internal/repository"
)

// ErrProjectNotFound 项目不存在或不属于当前用户。
var ErrProjectNotFound = errors.New("project not found")

// CreateProjectInput 创建项目入参。
type CreateProjectInput struct {
	Name        string
	Duration    *int
	AspectRatio string
	Style       string
}

// UpdateProjectInput 更新项目入参，仅非 nil 字段会被更新。
type UpdateProjectInput struct {
	Name        *string
	Status      *string
	Duration    *int
	AspectRatio *string
	Style       *string
}

// ProjectService 项目业务逻辑：属主校验、默认值、状态流转。
type ProjectService struct {
	projects repository.ProjectRepository
}

// NewProjectService 创建项目服务。
func NewProjectService(projects repository.ProjectRepository) *ProjectService {
	return &ProjectService{projects: projects}
}

// List 返回用户的项目列表。
func (s *ProjectService) List(userID uint) ([]model.Project, error) {
	return s.projects.ListByUser(userID)
}

// Create 创建项目并填充默认值。
func (s *ProjectService) Create(userID uint, input CreateProjectInput) (*model.Project, error) {
	project := &model.Project{
		Name:        input.Name,
		UserID:      userID,
		Status:      "draft",
		AspectRatio: defaultString(input.AspectRatio, "9:16"),
		Style:       defaultString(input.Style, "cinematic"),
	}
	if input.Duration != nil {
		project.Duration = *input.Duration
	}
	if err := s.projects.Create(project); err != nil {
		return nil, err
	}
	return project, nil
}

// GetProject 按 ID 取项目并校验属主；同时满足素材服务的 ProjectFinder 接口。
func (s *ProjectService) GetProject(id, userID uint) (*model.Project, error) {
	project, err := s.projects.Get(id)
	if err != nil {
		return nil, ErrProjectNotFound
	}
	if project.UserID != userID {
		return nil, ErrProjectNotFound
	}
	return project, nil
}

// Update 按 ID 部分更新项目（仅非 nil 字段生效）。
func (s *ProjectService) Update(id, userID uint, input UpdateProjectInput) (*model.Project, error) {
	project, err := s.GetProject(id, userID)
	if err != nil {
		return nil, err
	}
	if input.Name != nil {
		project.Name = *input.Name
	}
	if input.Status != nil {
		project.Status = *input.Status
	}
	if input.Duration != nil {
		project.Duration = *input.Duration
	}
	if input.AspectRatio != nil {
		project.AspectRatio = *input.AspectRatio
	}
	if input.Style != nil {
		project.Style = *input.Style
	}
	if err := s.projects.Update(project); err != nil {
		return nil, err
	}
	return project, nil
}

// Delete 按 ID 删除项目（先校验属主）。
func (s *ProjectService) Delete(id, userID uint) error {
	if _, err := s.GetProject(id, userID); err != nil {
		return err
	}
	return s.projects.Delete(id)
}

func defaultString(v, fallback string) string {
	if v == "" {
		return fallback
	}
	return v
}
