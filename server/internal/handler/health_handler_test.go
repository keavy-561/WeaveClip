package handler

import (
	"encoding/json"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestHealthHandler_Check(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := NewHealthHandler()

	tests := []struct {
		name   string
		query  string
		want   map[string]any
		status int
	}{
		{
			name:   "basic health check",
			query:  "",
			want:   map[string]any{"status": "ok"},
			status: 200,
		},
		{
			name:   "deep health check",
			query:  "deep=true",
			want:   map[string]any{"status": "ok", "db": "ok", "redis": "ok", "minio": "ok"},
			status: 200,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			if tt.query != "" {
				c.Request = httptest.NewRequest("GET", "/api/health?"+tt.query, nil)
			} else {
				c.Request = httptest.NewRequest("GET", "/api/health", nil)
			}

			h.Check(c)

			if w.Code != tt.status {
				t.Fatalf("expected status %d, got %d: %s", tt.status, w.Code, w.Body.String())
			}

			var resp map[string]any
			if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
				t.Fatalf("failed to parse response: %v", err)
			}

			for k, v := range tt.want {
				if resp[k] != v {
					t.Errorf("expected %s = %v, got %v", k, v, resp[k])
				}
			}
		})
	}
}
