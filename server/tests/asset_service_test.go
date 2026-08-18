package tests

import (
	"testing"

	"github.com/weaveclip/server/internal/model"
	"github.com/weaveclip/server/internal/service"
)

// fakeAssetRepo is an in-memory implementation of repository.AssetRepository for testing.
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
			return &r.assets[i], nil
		}
	}
	return nil, errNotFound
}

func (r *fakeAssetRepo) Create(asset *model.Asset) error {
	asset.ID = uint(len(r.assets) + 1)
	r.assets = append(r.assets, *asset)
	return nil
}

func (r *fakeAssetRepo) Delete(id uint) error {
	for i, a := range r.assets {
		if a.ID == id {
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

var errNotFound = &notFoundError{}

type notFoundError struct{}

func (e *notFoundError) Error() string { return "not found" }

func TestAssetService_ListAssets(t *testing.T) {
	repo := newFakeAssetRepo([]model.Asset{
		{ID: 1, ProjectID: 1, Type: "video", FileName: "a.mp4"},
		{ID: 2, ProjectID: 1, Type: "image", FileName: "b.jpg"},
		{ID: 3, ProjectID: 2, Type: "video", FileName: "c.mp4"},
	})
	finder := newFakeProjectFinder(model.Project{ID: 1, UserID: 10})
	svc := service.NewAssetService(repo, finder)

	assets, err := svc.ListAssets(1, 10)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(assets) != 2 {
		t.Fatalf("expected 2 assets, got %d", len(assets))
	}

	_, err = svc.ListAssets(99, 10)
	if err == nil {
		t.Fatal("expected error for non-existent project")
	}
}

func TestAssetService_CreateAsset(t *testing.T) {
	repo := newFakeAssetRepo(nil)
	finder := newFakeProjectFinder(model.Project{ID: 1, UserID: 10})
	svc := service.NewAssetService(repo, finder)

	created, err := svc.CreateAsset(1, 10, &model.Asset{Type: "video", FileName: "x.mp4", StoragePath: "/mock/x.mp4"})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if created.ID != 1 {
		t.Fatalf("expected id 1, got %d", created.ID)
	}
	if created.ProjectID != 1 {
		t.Fatalf("expected projectId 1, got %d", created.ProjectID)
	}

	_, err = svc.CreateAsset(99, 10, &model.Asset{Type: "video", FileName: "y.mp4", StoragePath: "/mock/y.mp4"})
	if err == nil {
		t.Fatal("expected error for non-existent project")
	}
}

func TestAssetService_GetAsset(t *testing.T) {
	repo := newFakeAssetRepo([]model.Asset{
		{ID: 1, ProjectID: 1, Type: "video", FileName: "a.mp4"},
	})
	finder := newFakeProjectFinder(model.Project{ID: 1, UserID: 10})
	svc := service.NewAssetService(repo, finder)

	asset, err := svc.GetAsset(1, 10)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if asset.FileName != "a.mp4" {
		t.Fatalf("expected fileName a.mp4, got %s", asset.FileName)
	}

	_, err = svc.GetAsset(99, 10)
	if err == nil {
		t.Fatal("expected error for non-existent asset")
	}

	_, err = svc.GetAsset(1, 20)
	if err == nil {
		t.Fatal("expected error for wrong user")
	}
}

func TestAssetService_DeleteAsset(t *testing.T) {
	repo := newFakeAssetRepo([]model.Asset{
		{ID: 1, ProjectID: 1, Type: "video", FileName: "a.mp4"},
	})
	finder := newFakeProjectFinder(model.Project{ID: 1, UserID: 10})
	svc := service.NewAssetService(repo, finder)

	if err := svc.DeleteAsset(1, 10); err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(repo.assets) != 0 {
		t.Fatalf("expected repo to be empty, got %d", len(repo.assets))
	}

	if err := svc.DeleteAsset(99, 10); err == nil {
		t.Fatal("expected error for non-existent asset")
	}

	if err := svc.DeleteAsset(1, 20); err == nil {
		t.Fatal("expected error for wrong user")
	}
}
