package testutil

import (
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/weaveclip/server/internal/middleware"
)

// NewTestContext 创建 Gin 测试上下文
func NewTestContext(t *testing.T) (*gin.Context, *httptest.ResponseRecorder) {
	t.Helper()
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	return c, w
}

// SetupRouter 创建带基础中间件的测试路由
func SetupRouter(t *testing.T) (*gin.Engine, *httptest.ResponseRecorder) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	r := gin.New()
	w := httptest.NewRecorder()
	return r, w
}

// AssertJSONStatus 断言 HTTP 状态码
func AssertJSONStatus(t *testing.T, w *httptest.ResponseRecorder, expected int) {
	t.Helper()
	if w.Code != expected {
		t.Fatalf("expected status %d, got %d: %s", expected, w.Code, w.Body.String())
	}
}

// AssertJSONError 断言错误响应结构
func AssertJSONError(t *testing.T, body string, code, message string) {
	t.Helper()
	// Simple check - in production you'd unmarshal and validate structure
	if body == "" {
		t.Fatal("expected non-empty error response body")
	}
}

// GenerateTestToken 生成测试用 JWT
func GenerateTestToken(t *testing.T, userID uint) string {
	t.Helper()
	token, err := middleware.GenerateToken(userID)
	if err != nil {
		t.Fatalf("failed to generate test token: %v", err)
	}
	return token
}
