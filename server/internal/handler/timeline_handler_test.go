package handler

import (
	"bytes"
	"encoding/json"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/weaveclip/server/internal/repository"
	"github.com/weaveclip/server/internal/service"
)
func setupTimeline(t *testing.T) *TimelineHandler {
	t.Helper()
	gin.SetMode(gin.TestMode)
	// mock 项目仓库默认 seed 含 (ID=1, UserID=1) 的项目
	timelineRepo := repository.NewMockTimelineRepo()
	return NewTimelineHandler(service.NewTimelineService(timelineRepo, service.NewProjectService(repository.NewMockProjectRepo())))
}

const sampleDSL = `{"version":"1.0","fps":30,"duration":10,"tracks":[{"id":"t1","type":"video","clips":[]}]}`

func doTimelineRequest(t *testing.T, h *TimelineHandler, method, url string, body []byte) *httptest.ResponseRecorder {
	t.Helper()
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	var reader *bytes.Reader
	if body != nil {
		reader = bytes.NewReader(body)
	} else {
		reader = bytes.NewReader(nil)
	}
	c.Request = httptest.NewRequest(method, url, reader)
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "id", Value: "1"}}
	c.Set("user_id", uint(1))
	switch method {
	case "GET":
		h.Get(c)
	case "PUT":
		h.Save(c)
	}
	return w
}

func TestTimelineHandler_SaveAndGet(t *testing.T) {
	h := setupTimeline(t)

	// 初始无时间线
	w := doTimelineRequest(t, h, "GET", "/api/projects/1/timeline", nil)
	assert.Equal(t, 404, w.Code)

	// 保存 v1
	w = doTimelineRequest(t, h, "PUT", "/api/projects/1/timeline", []byte(sampleDSL))
	require.Equal(t, 201, w.Code)
	var resp struct {
		Timeline struct {
			Version int `json:"version"`
		} `json:"timeline"`
	}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, 1, resp.Timeline.Version)

	// 保存 v2
	w = doTimelineRequest(t, h, "PUT", "/api/projects/1/timeline", []byte(sampleDSL))
	require.Equal(t, 201, w.Code)
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, 2, resp.Timeline.Version)

	// GET 默认最新（v2）
	w = doTimelineRequest(t, h, "GET", "/api/projects/1/timeline", nil)
	require.Equal(t, 200, w.Code)
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, 2, resp.Timeline.Version)

	// GET 指定版本
	w = doTimelineRequest(t, h, "GET", "/api/projects/1/timeline?version=1", nil)
	require.Equal(t, 200, w.Code)
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, 1, resp.Timeline.Version)

	// 非法版本号
	w = doTimelineRequest(t, h, "GET", "/api/projects/1/timeline?version=abc", nil)
	assert.Equal(t, 400, w.Code)

	// 非对象 JSON
	w = doTimelineRequest(t, h, "PUT", "/api/projects/1/timeline", []byte(`[1,2,3]`))
	assert.Equal(t, 400, w.Code)

	// 非法 JSON
	w = doTimelineRequest(t, h, "PUT", "/api/projects/1/timeline", []byte(`{invalid`))
	assert.Equal(t, 400, w.Code)

	// 越权（用户 2）
	w2 := httptest.NewRecorder()
	c2, _ := gin.CreateTestContext(w2)
	c2.Request = httptest.NewRequest("GET", "/api/projects/1/timeline", nil)
	c2.Params = gin.Params{{Key: "id", Value: "1"}}
	c2.Set("user_id", uint(2))
	h.Get(c2)
	assert.Equal(t, 404, w2.Code)
}
