package middleware

import (
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestAuthMiddleware(t *testing.T) {
	InitJWT("test_secret", time.Hour)

	t.Run("missing authorization header", func(t *testing.T) {
		gin.SetMode(gin.TestMode)
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("GET", "/api/test", nil)

		Auth()(c)

		assert.Equal(t, 401, w.Code)
	})

	t.Run("invalid authorization header format", func(t *testing.T) {
		gin.SetMode(gin.TestMode)
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("GET", "/api/test", nil)
		c.Request.Header.Set("Authorization", "InvalidToken")

		Auth()(c)

		assert.Equal(t, 401, w.Code)
	})

	t.Run("invalid token", func(t *testing.T) {
		gin.SetMode(gin.TestMode)
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("GET", "/api/test", nil)
		c.Request.Header.Set("Authorization", "Bearer invalidtoken")

		Auth()(c)

		assert.Equal(t, 401, w.Code)
	})

	t.Run("valid token", func(t *testing.T) {
		gin.SetMode(gin.TestMode)
		token, _ := GenerateToken(1)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("GET", "/api/test", nil)
		c.Request.Header.Set("Authorization", "Bearer "+token)

		Auth()(c)

		assert.Equal(t, 200, w.Code)
		userID, exists := c.Get("user_id")
		assert.True(t, exists)
		assert.Equal(t, uint(1), userID.(uint))
	})
}

func TestWSQueryAuth(t *testing.T) {
	InitJWT("test_secret", time.Hour)

	t.Run("missing token", func(t *testing.T) {
		gin.SetMode(gin.TestMode)
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("GET", "/ws", nil)

		WSQueryAuth()(c)

		assert.Equal(t, 401, w.Code)
	})

	t.Run("invalid token", func(t *testing.T) {
		gin.SetMode(gin.TestMode)
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("GET", "/ws?token=invalid", nil)

		WSQueryAuth()(c)

		assert.Equal(t, 401, w.Code)
	})

	t.Run("valid token", func(t *testing.T) {
		gin.SetMode(gin.TestMode)
		token, _ := GenerateToken(42)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("GET", "/ws?token="+token, nil)

		WSQueryAuth()(c)

		assert.Equal(t, 200, w.Code)
		userID, exists := c.Get("user_id")
		assert.True(t, exists)
		assert.Equal(t, uint(42), userID.(uint))
	})
}

func TestCORS(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("allows all origins when empty", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("OPTIONS", "/api/test", nil)
		c.Request.Header.Set("Origin", "http://example.com")

		CORS(nil)(c)

		assert.Equal(t, 204, w.Code)
		assert.Equal(t, "*", w.Header().Get("Access-Control-Allow-Origin"))
	})

	t.Run("allows specific origin", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("OPTIONS", "/api/test", nil)
		c.Request.Header.Set("Origin", "http://allowed.com")

		CORS([]string{"http://allowed.com"})(c)

		assert.Equal(t, 204, w.Code)
		assert.Equal(t, "http://allowed.com", w.Header().Get("Access-Control-Allow-Origin"))
	})

	t.Run("rejects disallowed origin", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("GET", "/api/test", nil)
		c.Request.Header.Set("Origin", "http://evil.com")

		CORS([]string{"http://allowed.com"})(c)

		// Should not set Allow-Origin header for disallowed origins
		assert.Empty(t, w.Header().Get("Access-Control-Allow-Origin"))
	})
}
