package tests

import (
	"testing"

	"github.com/weaveclip/server/internal/model"
	"github.com/weaveclip/server/internal/service"
)

// FakeUserRepo is an in-memory fake for testing auth service.
type FakeUserRepo struct {
	users map[string]*model.User
}

func NewFakeUserRepo() *FakeUserRepo {
	return &FakeUserRepo{users: make(map[string]*model.User)}
}

func (r *FakeUserRepo) GetByEmail(email string) (*model.User, error) {
	u, ok := r.users[email]
	if !ok {
		return nil, nil
	}
	return u, nil
}

func (r *FakeUserRepo) Create(user *model.User) error {
	r.users[user.Email] = user
	return nil
}

func (r *FakeUserRepo) GetByID(id uint) (*model.User, error) {
	for _, u := range r.users {
		if u.ID == id {
			return u, nil
		}
	}
	return nil, nil
}

func TestAuthService_Register(t *testing.T) {
	repo := NewFakeUserRepo()
	svc := service.NewAuthService(repo)

	user, err := svc.Register("alice@example.com", "password123", "Alice")
	if err != nil {
		t.Fatalf("register failed: %v", err)
	}
	if user == nil || user.Email != "alice@example.com" {
		t.Fatalf("unexpected user: %+v", user)
	}

	// Duplicate email
	_, err = svc.Register("alice@example.com", "anotherpass", "Alice2")
	if err == nil {
		t.Fatal("expected error on duplicate email")
	}

	// Invalid email
	_, err = svc.Register("invalid", "password123", "")
	if err == nil {
		t.Fatal("expected error on invalid email")
	}

	// Short password
	_, err = svc.Register("bob@example.com", "short", "Bob")
	if err == nil {
		t.Fatal("expected error on short password")
	}
}

func TestAuthService_Login(t *testing.T) {
	repo := NewFakeUserRepo()
	svc := service.NewAuthService(repo)

	_, err := svc.Register("alice@example.com", "password123", "Alice")
	if err != nil {
		t.Fatalf("register failed: %v", err)
	}

	user, err := svc.Login("alice@example.com", "password123")
	if err != nil {
		t.Fatalf("login failed: %v", err)
	}
	if user == nil || user.Email != "alice@example.com" {
		t.Fatalf("unexpected user: %+v", user)
	}

	// Wrong password
	_, err = svc.Login("alice@example.com", "wrongpass")
	if err == nil {
		t.Fatal("expected error on wrong password")
	}

	// Non-existent user
	_, err = svc.Login("nobody@example.com", "password123")
	if err == nil {
		t.Fatal("expected error on non-existent user")
	}
}
