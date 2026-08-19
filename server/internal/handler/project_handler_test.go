package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestProjectHandler_List(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("list projects in mock mode for user 1", func(t *testing.T) {
		ResetMockProjectStoreForTest()
		h := setupProject(t)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("GET", "/api/projects", nil)
		c.Set("user_id", uint(1))

		h.List(c)

		assert.Equal(t, 200, w.Code)

		var resp map[string]any
		if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
			t.Fatalf("failed to parse response: %v", err)
		}
		// mock mode returns seeded projects for user 1
		projects, ok := resp["projects"]
		if !ok {
			t.Fatal("expected projects field in response")
		}
		// Could be nil (null) or empty array for non-matching user
		if projects == nil {
			t.Fatal("expected non-nil projects for user 1")
		}
		projectsSlice, ok := projects.([]any)
		if !ok {
			t.Fatalf("expected projects to be array, got %T", projects)
		}
		assert.NotEmpty(t, projectsSlice)
	})

	t.Run("empty list for non-existent user", func(t *testing.T) {
		ResetMockProjectStoreForTest()
		h := setupProject(t)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("GET", "/api/projects", nil)
		c.Set("user_id", uint(99))

		h.List(c)

		assert.Equal(t, 200, w.Code)

		var resp map[string]any
		if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
			t.Fatalf("failed to parse response: %v", err)
		}
		projects, ok := resp["projects"]
		if !ok {
			t.Fatal("expected projects field")
		}
		// nil or empty slice are both acceptable for no projects
		if projects != nil {
			projectsSlice, ok := projects.([]any)
			if ok {
				assert.Empty(t, projectsSlice)
			}
		}
	})
}

func TestProjectHandler_Create(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("create project successfully", func(t *testing.T) {
		ResetMockProjectStoreForTest()
		h := setupProject(t)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = JSONRequest(t, "POST", "/api/projects", map[string]any{
			"name":        "Test Project",
			"duration":    45,
			"aspectRatio": "9:16",
			"style":       "cinematic",
		})
		c.Set("user_id", uint(1))

		h.Create(c)

		assert.Equal(t, 201, w.Code)

		var resp map[string]any
		if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
			t.Fatalf("failed to parse response: %v", err)
		}
		project, ok := resp["project"].(map[string]any)
		if !ok {
			t.Fatal("expected project in response")
		}
		assert.Equal(t, "Test Project", project["name"])
		assert.Equal(t, "draft", project["status"])
	})

	t.Run("create project with missing name", func(t *testing.T) {
		ResetMockProjectStoreForTest()
		h := setupProject(t)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = JSONRequest(t, "POST", "/api/projects", map[string]any{})
		c.Set("user_id", uint(1))

		h.Create(c)

		assert.Equal(t, 400, w.Code)
	})
}

func TestProjectHandler_Get(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("get existing seeded project", func(t *testing.T) {
		ResetMockProjectStoreForTest()
		h := setupProject(t)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("GET", "/api/projects/1", nil)
		c.Set("user_id", uint(1))
		c.Params = gin.Params{{Key: "id", Value: "1"}}

		h.Get(c)

		assert.Equal(t, 200, w.Code)

		var resp map[string]any
		if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
			t.Fatalf("failed to parse response: %v", err)
		}
		project, ok := resp["project"].(map[string]any)
		if !ok {
			t.Fatal("expected project in response")
		}
		// Seeded mock project ID 1 is "NYC Travel Vlog"
		assert.Equal(t, "NYC Travel Vlog", project["name"])
	})

	t.Run("get non-existent project", func(t *testing.T) {
		ResetMockProjectStoreForTest()
		h := setupProject(t)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("GET", "/api/projects/999", nil)
		c.Set("user_id", uint(1))
		c.Params = gin.Params{{Key: "id", Value: "999"}}

		h.Get(c)

		assert.Equal(t, 404, w.Code)
	})
}

func TestProjectHandler_Delete(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("delete existing seeded project", func(t *testing.T) {
		ResetMockProjectStoreForTest()
		h := setupProject(t)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("DELETE", "/api/projects/1", nil)
		c.Set("user_id", uint(1))
		c.Params = gin.Params{{Key: "id", Value: "1"}}

		h.Delete(c)

		assert.Equal(t, http.StatusNoContent, w.Code)
	})

	t.Run("delete non-existent project", func(t *testing.T) {
		ResetMockProjectStoreForTest()
		h := setupProject(t)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("DELETE", "/api/projects/999", nil)
		c.Set("user_id", uint(1))
		c.Params = gin.Params{{Key: "id", Value: "999"}}

		h.Delete(c)

		assert.Equal(t, 404, w.Code)
	})
}
