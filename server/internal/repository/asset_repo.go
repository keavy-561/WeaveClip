package repository

import (
	"sync"

	"github.com/weaveclip/server/internal/model"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type AssetRepository interface {
	ListByProject(projectID uint) ([]model.Asset, error)
	Get(id uint) (*model.Asset, error)
	Create(asset *model.Asset) error
	Update(asset *model.Asset) error
	Delete(id uint) error
	// UpdateAnalysis 只更新 analysis 列：分析 worker 与上传处理管线并发写同一素材，
	// 整行 Save 会互相清空对方刚写入的字段（工单 WO8-10）。
	UpdateAnalysis(assetID uint, analysis []byte) error
	// UpdateMediaInfo 只更新上传处理产物列（status/file_size/探针字段/缩略图/metadata），
	// 供处理管线局部回写（工单 WO8-10）。
	UpdateMediaInfo(assetID uint, info AssetMediaInfo) error
}

// AssetMediaInfo 上传处理管线的产物字段（UpdateMediaInfo 局部更新用，工单 WO8-10）。
type AssetMediaInfo struct {
	Status       string
	FileSize     int64
	Duration     float64
	Width        int
	Height       int
	FPS          float64
	Codec        string
	ThumbnailURL string
	Metadata     []byte
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

func (r *gormAssetRepo) Update(asset *model.Asset) error {
	return r.db.Save(asset).Error
}

// UpdateAnalysis 单列更新 analysis（工单 WO8-10）。
func (r *gormAssetRepo) UpdateAnalysis(assetID uint, analysis []byte) error {
	return r.db.Model(&model.Asset{}).Where("id = ?", assetID).
		Update("analysis", datatypes.JSON(analysis)).Error
}

// UpdateMediaInfo 局部更新处理产物列，不触碰 analysis/transcript（工单 WO8-10）。
func (r *gormAssetRepo) UpdateMediaInfo(assetID uint, info AssetMediaInfo) error {
	return r.db.Model(&model.Asset{}).Where("id = ?", assetID).Updates(map[string]any{
		"status":        info.Status,
		"file_size":     info.FileSize,
		"duration":      info.Duration,
		"width":         info.Width,
		"height":        info.Height,
		"fps":           info.FPS,
		"codec":         info.Codec,
		"thumbnail_url": info.ThumbnailURL,
		"metadata":      datatypes.JSON(info.Metadata),
	}).Error
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
	if asset.ID == 0 {
		var maxID uint
		for _, a := range r.assets {
			if a.ID > maxID {
				maxID = a.ID
			}
		}
		asset.ID = maxID + 1
	}
	r.assets = append(r.assets, *asset)
	return nil
}

func (r *mockAssetRepo) Update(asset *model.Asset) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	for i := range r.assets {
		if r.assets[i].ID == asset.ID {
			r.assets[i] = *asset
			return nil
		}
	}
	return gorm.ErrRecordNotFound
}

// UpdateAnalysis mock 实现（工单 WO8-10）。
func (r *mockAssetRepo) UpdateAnalysis(assetID uint, analysis []byte) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	for i := range r.assets {
		if r.assets[i].ID == assetID {
			r.assets[i].Analysis = datatypes.JSON(analysis)
			return nil
		}
	}
	return gorm.ErrRecordNotFound
}

// UpdateMediaInfo mock 实现（工单 WO8-10）。
func (r *mockAssetRepo) UpdateMediaInfo(assetID uint, info AssetMediaInfo) error {
	r.mu.Lock()
	defer r.mu.Unlock()
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
	return gorm.ErrRecordNotFound
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
