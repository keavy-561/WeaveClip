package repository

import (
	"sync"

	"github.com/weaveclip/server/internal/model"
	"gorm.io/gorm"
)

type AssetRepository interface {
	ListByProject(projectID uint) ([]model.Asset, error)
	Get(id uint) (*model.Asset, error)
	Create(asset *model.Asset) error
	Delete(id uint) error
}

type gormAssetRepo struct {
	db *gorm.DB
}

func NewGormAssetRepo(db *gorm.DB) AssetRepository {
	return &gormAssetRepo{db: db}
}

func (r *gormAssetRepo) ListByProject(projectID uint) ([]model.Asset, error) {
	var assets []model.Asset
	if err := r.db.Where("project_id = ?", projectID).Order("created_at DESC").Find(&assets).Error; err != nil {
		return nil, err
	}
	return assets, nil
}

func (r *gormAssetRepo) Get(id uint) (*model.Asset, error) {
	var asset model.Asset
	if err := r.db.First(&asset, id).Error; err != nil {
		return nil, err
	}
	return &asset, nil
}

func (r *gormAssetRepo) Create(asset *model.Asset) error {
	return r.db.Create(asset).Error
}

func (r *gormAssetRepo) Delete(id uint) error {
	return r.db.Delete(&model.Asset{}, id).Error
}

type mockAssetRepo struct {
	mu     sync.RWMutex
	assets []model.Asset
}

func NewMockAssetRepo(initial []model.Asset) AssetRepository {
	return &mockAssetRepo{assets: initial}
}

func (r *mockAssetRepo) ListByProject(projectID uint) ([]model.Asset, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var result []model.Asset
	for _, a := range r.assets {
		if a.ProjectID == projectID {
			result = append(result, a)
		}
	}
	return result, nil
}

func (r *mockAssetRepo) Get(id uint) (*model.Asset, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for _, a := range r.assets {
		if a.ID == id {
			cpy := a
			return &cpy, nil
		}
	}
	return nil, gorm.ErrRecordNotFound
}

func (r *mockAssetRepo) Create(asset *model.Asset) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	asset.ID = uint(len(r.assets) + 1)
	r.assets = append(r.assets, *asset)
	return nil
}

func (r *mockAssetRepo) Delete(id uint) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	for i, a := range r.assets {
		if a.ID == id {
			r.assets = append(r.assets[:i], r.assets[i+1:]...)
			return nil
		}
	}
	return gorm.ErrRecordNotFound
}
