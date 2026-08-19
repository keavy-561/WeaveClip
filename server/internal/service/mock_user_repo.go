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

func NewMockUserRepo() *MockUserRepo {
	return &MockUserRepo{users: make([]model.User, 0)}
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
