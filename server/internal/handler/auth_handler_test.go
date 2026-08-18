package handler

import (
	"encoding/json"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/weaveclip/server/internal/middleware"
	"github.com/weaveclip/server/internal/model"
)

func TestAuthHandler_Register(t *testing.T) {
	middleware.InitJWT("test_secret", 0)
	h := setupAuth(t)
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name       string
		body       map[string]any
		wantStatus int
		wantBody   map[string]any
	}{
		{
			name: "successful register",
			body: map[string]any{
				"email":    "test@example.com",
				"password": "password123",
				"name":     "Test User",
			},
			wantStatus: 201,
			wantBody:   map[string]any{"email": "test@example.com", "name": "Test User"},
		},
		{
			name: "duplicate email",
			body: map[string]any{
				"email":    "test@example.com",
				"password": "password456",
				"name":     "Another User",
			},
			wantStatus: 400,
		},
		{
			name: "invalid email",
			body: map[string]any{
				"email":    "invalid",
				"password": "password123",
				"name":     "Test",
			},
			wantStatus: 400,
		},
		{
			name: "short password",
			body: map[string]any{
				"email":    "short@example.com",
				"password": "short",
				"name":     "Test",
			},
			wantStatus: 400,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = JSONRequest(t, "POST", "/api/auth/register", tt.body)

			h.Register(c)

			if w.Code != tt.wantStatus {
				t.Fatalf("expected status %d, got %d: %s", tt.wantStatus, w.Code, w.Body.String())
			}

			if tt.wantBody != nil && tt.wantStatus == 201 {
				var resp map[string]any
				if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
					t.Fatalf("failed to parse response: %v", err)
				}
				user, ok := resp["user"].(map[string]any)
				if !ok {
					t.Fatal("expected user in response")
				}
				for k, v := range tt.wantBody {
					if user[k] != v {
						t.Errorf("expected user.%s = %v, got %v", k, v, user[k])
					}
				}
			}
		})
	}
}

func TestAuthHandler_Login(t *testing.T) {
	middleware.InitJWT("test_secret", 0)
	h := setupAuth(t)

	// Pre-register a user
	repo := newFakeUserRepo()
	repo.Create(&model.User{
		Email:        "alice@example.com",
		PasswordHash: "hashed_password",
		Name:         "Alice",
	})
	// We need to update the handler with this repo
	// For simplicity, we'll test the register first then login
	_ = repo

	gin.SetMode(gin.TestMode)

	t.Run("successful login", func(t *testing.T) {
		// First register
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = JSONRequest(t, "POST", "/api/auth/register", map[string]any{
			"email":    "alice@example.com",
			"password": "password123",
			"name":     "Alice",
		})
		h.Register(c)
		assert.Equal(t, 201, w.Code)

		// Then login
		w2 := httptest.NewRecorder()
		c2, _ := gin.CreateTestContext(w2)
		c2.Request = JSONRequest(t, "POST", "/api/auth/login", map[string]any{
			"email":    "alice@example.com",
			"password": "password123",
		})
		h.Login(c2)

		assert.Equal(t, 200, w2.Code)

		var resp map[string]any
		if err := json.Unmarshal(w2.Body.Bytes(), &resp); err != nil {
			t.Fatalf("failed to parse response: %v", err)
		}
		if _, ok := resp["token"]; !ok {
			t.Error("expected token in response")
		}
		if _, ok := resp["user"]; !ok {
			t.Error("expected user in response")
		}
	})

	t.Run("invalid credentials", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = JSONRequest(t, "POST", "/api/auth/login", map[string]any{
			"email":    "alice@example.com",
			"password": "wrongpassword",
		})
		h.Login(c)

		assert.Equal(t, 401, w.Code)
	})
}

func TestAuthHandler_Me(t *testing.T) {
	middleware.InitJWT("test_secret", 0)
	h := setupAuth(t)
	gin.SetMode(gin.TestMode)

	// Register and login to get token
	wReg := httptest.NewRecorder()
	cReg, _ := gin.CreateTestContext(wReg)
	cReg.Request = JSONRequest(t, "POST", "/api/auth/register", map[string]any{
		"email":    "me@example.com",
		"password": "password123",
		"name":     "Me User",
	})
	h.Register(cReg)
	assert.Equal(t, 201, wReg.Code)

	wLogin := httptest.NewRecorder()
	cLogin, _ := gin.CreateTestContext(wLogin)
	cLogin.Request = JSONRequest(t, "POST", "/api/auth/login", map[string]any{
		"email":    "me@example.com",
		"password": "password123",
	})
	h.Login(cLogin)
	assert.Equal(t, 200, wLogin.Code)

	var loginResp map[string]any
	if err := json.Unmarshal(wLogin.Body.Bytes(), &loginResp); err != nil {
		t.Fatalf("failed to parse login response: %v", err)
	}
	token, ok := loginResp["token"].(string)
	if !ok {
		t.Fatal("expected token in login response")
	}

	t.Run("get current user with valid token", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("GET", "/api/auth/me", nil)
		c.Request.Header.Set("Authorization", "Bearer "+token)
		// Simulate what Auth middleware does
		userID, _ := middleware.ParseToken(token)
		c.Set("user_id", userID)

		h.Me(c)

		assert.Equal(t, 200, w.Code)

		var resp map[string]any
		if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
			t.Fatalf("failed to parse response: %v", err)
		}
		if _, ok := resp["user"]; !ok {
			t.Error("expected user in response")
		}
	})

	t.Run("get current user without token", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("GET", "/api/auth/me", nil)

		h.Me(c)

		assert.Equal(t, 401, w.Code)
	})
}
