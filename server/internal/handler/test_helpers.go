package handler

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/weaveclip/server/internal/config"
	"github.com/weaveclip/server/internal/middleware"
	"github.com/weaveclip/server/internal/model"
	"github.com/weaveclip/server/internal/service"
)

var errNotFound = &notFoundError{}

type notFoundError struct{}

func (e *notFoundError) Error() string { return "not found" }

// fakeUserRepo is an in-memory implementation for testing.
type fakeUserRepo struct {
	users map[string]*model.User
}

func newFakeUserRepo() *fakeUserRepo {
	return &fakeUserRepo{users: make(map[string]*model.User)}
}

func (r *fakeUserRepo) GetByEmail(email string) (*model.User, error) {
	u, ok := r.users[email]
	if !ok {
		return nil, nil
	}
	return u, nil
}

func (r *fakeUserRepo) Create(user *model.User) error {
	r.users[user.Email] = user
	return nil
}

func (r *fakeUserRepo) GetByID(id uint) (*model.User, error) {
	for _, u := range r.users {
		if u.ID == id {
			return u, nil
		}
	}
	return nil, nil
}

func setupAuth(t *testing.T) *AuthHandler {
	t.Helper()
	middleware.InitJWT("test_secret", 0)
	repo := newFakeUserRepo()
	svc := service.NewAuthService(repo)
	return NewAuthHandler(svc)
}

func setupProject(t *testing.T) *ProjectHandler {
	t.Helper()
	return NewProjectHandler(nil) // nil db = mock mode
}

func JSONRequest(t *testing.T, method, url string, body any) *http.Request {
	t.Helper()
	var buf bytes.Buffer
	if body != nil {
		if err := json.NewEncoder(&buf).Encode(body); err != nil {
			t.Fatalf("failed to encode request body: %v", err)
		}
	}
	req := httptest.NewRequest(method, url, &buf)
	req.Header.Set("Content-Type", "application/json")
	return req
}

func DoRequest(t *testing.T, r *gin.Engine, req *http.Request) *httptest.ResponseRecorder {
	t.Helper()
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

func ParseResponse[T any](t *testing.T, w *httptest.ResponseRecorder) T {
	t.Helper()
	var result T
	if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
		t.Fatalf("failed to parse response: %v\nbody: %s", err, w.Body.String())
	}
	return result
}

// TestConfig returns a test config
func TestConfig() *config.Config {
	return &config.Config{
		Server: struct {
			Port         int           `yaml:"port"`
			Mode         string        `yaml:"mode"`
			RequestTimeout time.Duration `yaml:"request_timeout"`
		}{
			Port:     8080,
			Mode:     gin.TestMode,
		},
		JWT: struct {
			Secret string        `yaml:"secret"`
			Expiry time.Duration `yaml:"expiry"`
		}{
			Secret: "test_secret",
			Expiry: 0,
		},
	}
}
