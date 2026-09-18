package handler

import (
	"encoding/json"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHealthHandler_Shallow(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := NewHealthHandler(nil, "", nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/api/health", nil)

	h.Check(c)

	assert.Equal(t, 200, w.Code)
	var resp map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, "ok", resp["status"])
}

func TestHealthHandler_DeepMockMode(t *testing.T) {
	gin.SetMode(gin.TestMode)
	// db 为 nil 即 mock 模式：各组件报告 mock，整体 ok
	h := NewHealthHandler(nil, "localhost:6379", nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/api/health?deep=true", nil)

	h.Check(c)

	assert.Equal(t, 200, w.Code)
	var resp map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, "ok", resp["status"])
	assert.Equal(t, "mock", resp["db"])
	assert.Equal(t, "mock", resp["redis"])
	assert.Equal(t, "mock", resp["storage"])
}
