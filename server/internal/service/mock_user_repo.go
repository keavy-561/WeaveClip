package service

import (
	"sync"

	"github.com/weaveclip/server/internal/model"
)

// MockUserRepo is an in-memory user repository for mock mode.
type MockUserRepo struct {
	mu    sync.RWMutex
	users []model.User
}

// 演示账号（走查 P0-1）：前端“填入演示账号”在 mock 模式下可直接登录。
const (
	DemoUserEmail    = "demo@weaveclip.dev"
	DemoUserPassword = "demo1234"
)

func NewMockUserRepo() *MockUserRepo {
	r := &MockUserRepo{users: make([]model.User, 0)}
	// 预置演示账号；bcrypt 哈希失败时跳过（不影响注册流程创建新用户）
	if hash, err := HashPassword(DemoUserPassword); err == nil {
		r.users = append(r.users, model.User{
			ID:           1,
			Email:        DemoUserEmail,
			PasswordHash: hash,
			Name:         "Demo",
		})
	}
	return r
}

func (r *MockUserRepo) GetByEmail(email string) (*model.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for _, u := range r.users {
		if u.Email == email {
			return &u, nil
		}
	}
	return nil, nil
}

func (r *MockUserRepo) Create(user *model.User) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	user.ID = uint(len(r.users) + 1)
	r.users = append(r.users, *user)
	return nil
}

func (r *MockUserRepo) GetByID(id uint) (*model.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for _, u := range r.users {
		if u.ID == id {
			return &u, nil
		}
	}
	return nil, nil
}
