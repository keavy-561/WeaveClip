package middleware

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestRequestTimeout_FastHandler(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(RequestTimeout(time.Second))
	r.GET("/fast", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest("GET", "/fast", nil))

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestRequestTimeout_SlowHandler(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(RequestTimeout(10 * time.Millisecond))
	r.GET("/slow", func(c *gin.Context) {
		time.Sleep(80 * time.Millisecond)
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest("GET", "/slow", nil))

	assert.Equal(t, http.StatusGatewayTimeout, w.Code)
	var body map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("invalid JSON body: %v", err)
	}
	assert.Equal(t, "GATEWAY_TIMEOUT", body["code"])
}

func TestRequestTimeout_PanicRecovered(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	// 模拟真实装配：Recovery 在超时中间件之上，panic 仍能被恢复
	r.Use(gin.Recovery())
	r.Use(RequestTimeout(time.Second))
	r.GET("/panic", func(c *gin.Context) {
		panic("boom")
	})

	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest("GET", "/panic", nil))

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestRequestTimeout_Disabled(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(RequestTimeout(0))
	r.GET("/ok", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest("GET", "/ok", nil))

	assert.Equal(t, http.StatusOK, w.Code)
}
