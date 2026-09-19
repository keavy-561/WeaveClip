package handler

import (
	"encoding/json"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/weaveclip/server/internal/model"
	"github.com/weaveclip/server/internal/repository"
	"github.com/weaveclip/server/internal/service"
	"gorm.io/datatypes"
)

// fakeAssetRepo is an in-memory implementation for testing.
type fakeAssetRepo struct {
	assets []model.Asset
}

func newFakeAssetRepo(initial []model.Asset) *fakeAssetRepo {
	return &fakeAssetRepo{assets: initial}
}

func (r *fakeAssetRepo) ListByProject(projectID uint) ([]model.Asset, error) {
	var result []model.Asset
	for _, a := range r.assets {
		if a.ProjectID == projectID {
			result = append(result, a)
		}
	}
	return result, nil
}

func (r *fakeAssetRepo) Get(id uint) (*model.Asset, error) {
	for i := range r.assets {
		if r.assets[i].ID == id {
			cpy := r.assets[i]
			return &cpy, nil
		}
	}
	return nil, errNotFound
}

func (r *fakeAssetRepo) Create(asset *model.Asset) error {
	asset.ID = uint(len(r.assets) + 1)
	r.assets = append(r.assets, *asset)
	return nil
}

func (r *fakeAssetRepo) Update(asset *model.Asset) error {
	for i := range r.assets {
		if r.assets[i].ID == asset.ID {
			r.assets[i] = *asset
			return nil
		}
	}
	return nil
}

// UpdateAnalysis 补齐 AssetRepository 新增接口方法（工单 WO8-10）。
func (r *fakeAssetRepo) UpdateAnalysis(assetID uint, analysis []byte) error {
	for i := range r.assets {
		if r.assets[i].ID == assetID {
			r.assets[i].Analysis = datatypes.JSON(analysis)
			return nil
		}
	}
	return nil
}

// UpdateMediaInfo 补齐 AssetRepository 新增接口方法（工单 WO8-10）。
func (r *fakeAssetRepo) UpdateMediaInfo(assetID uint, info repository.AssetMediaInfo) error {
	for i := range r.assets {
		if r.assets[i].ID != assetID {
			continue
		}
		if info.Status != "" {
			r.assets[i].Status = info.Status
		}
		if info.FileSize > 0 {
			r.assets[i].FileSize = info.FileSize
		}
		if info.Duration > 0 {
			r.assets[i].Duration = info.Duration
		}
		if info.Width > 0 {
			r.assets[i].Width = info.Width
		}
		if info.Height > 0 {
			r.assets[i].Height = info.Height
		}
		if info.FPS > 0 {
			r.assets[i].FPS = info.FPS
		}
		if info.Codec != "" {
			r.assets[i].Codec = info.Codec
		}
		if info.ThumbnailURL != "" {
			r.assets[i].ThumbnailURL = info.ThumbnailURL
		}
		if len(info.Metadata) > 0 {
			r.assets[i].Metadata = datatypes.JSON(info.Metadata)
		}
		return nil
	}
	return nil
}

func (r *fakeAssetRepo) Delete(id uint) error {
	for i := range r.assets {
		if r.assets[i].ID == id {
			r.assets = append(r.assets[:i], r.assets[i+1:]...)
			return nil
		}
	}
	return errNotFound
}

// fakeProjectFinder implements service.ProjectFinder for testing.
type fakeProjectFinder struct {
	projects map[uint]model.Project
}

func newFakeProjectFinder(projects ...model.Project) *fakeProjectFinder {
	m := make(map[uint]model.Project)
	for _, p := range projects {
		m[p.ID] = p
	}
	return &fakeProjectFinder{projects: m}
}

func (f *fakeProjectFinder) GetProject(id, userID uint) (*model.Project, error) {
	p, ok := f.projects[id]
	if !ok {
		return nil, errNotFound
	}
	if p.UserID != userID {
		return nil, errNotFound
	}
	return &p, nil
}

func TestAssetHandler_CRUD(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Setup with fakes
	assetRepo := newFakeAssetRepo(nil)
	projectFinder := newFakeProjectFinder(model.Project{ID: 1, UserID: 1})
	assetService := service.NewAssetService(assetRepo, projectFinder)
	assetHandler := NewAssetHandler(assetService, nil)

	t.Run("create asset", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = JSONRequest(t, "POST", "/api/projects/1/assets", map[string]any{
			"type":        "video",
			"storagePath": "/mock/a.mp4",
			"fileName":    "a.mp4",
			"fileSize":    1024,
			"duration":    10.5,
		})
		c.Set("user_id", uint(1))
		c.Params = gin.Params{{Key: "id", Value: "1"}}

		assetHandler.Create(c)

		assert.Equal(t, 201, w.Code)

		var resp map[string]any
		if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
			t.Fatalf("failed to parse response: %v", err)
		}
		asset, ok := resp["asset"].(map[string]any)
		if !ok {
			t.Fatal("expected asset in response")
		}
		assert.Equal(t, "a.mp4", asset["fileName"])
		assert.Equal(t, "video", asset["type"])
		assert.Equal(t, float64(1), asset["id"])
	})

	t.Run("list assets", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("GET", "/api/projects/1/assets", nil)
		c.Set("user_id", uint(1))
		c.Params = gin.Params{{Key: "id", Value: "1"}}

		assetHandler.List(c)

		assert.Equal(t, 200, w.Code)

		var resp map[string]any
		if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
			t.Fatalf("failed to parse response: %v", err)
		}
		assets, ok := resp["assets"].([]any)
		if !ok {
			t.Fatal("expected assets array")
		}
		assert.Len(t, assets, 1)
	})

	t.Run("get asset", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("GET", "/api/assets/1", nil)
		c.Set("user_id", uint(1))
		c.Params = gin.Params{
			{Key: "id", Value: "1"},
		}

		assetHandler.Get(c)

		assert.Equal(t, 200, w.Code)
	})

	t.Run("get non-existent asset", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("GET", "/api/assets/999", nil)
		c.Set("user_id", uint(1))
		c.Params = gin.Params{
			{Key: "id", Value: "999"},
		}

		assetHandler.Get(c)

		assert.Equal(t, 404, w.Code)
	})

	t.Run("delete asset", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("DELETE", "/api/assets/1", nil)
		c.Set("user_id", uint(1))
		c.Params = gin.Params{
			{Key: "id", Value: "1"},
		}

		assetHandler.Delete(c)

		assert.Equal(t, 204, w.Code)
	})
}
