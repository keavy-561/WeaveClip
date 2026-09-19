package service

import (
	"errors"
	"fmt"
	"strings"

	"github.com/weaveclip/server/internal/model"
	"github.com/weaveclip/server/internal/repository"
)

// ErrInvalidStoragePath 素材对象键声明了不属于目标项目的 projects/ 路径，
// 防止登记他人对象后借播放地址装饰拿到预签名 GET（跨租户读取，工单 WO8-04）。
var ErrInvalidStoragePath = errors.New("invalid storage path for project")

// AssetService provides asset-related business logic.
type AssetService struct {
	assets repository.AssetRepository
	proj   ProjectFinder
}

// ProjectFinder is a minimal interface to verify project existence and ownership.
type ProjectFinder interface {
	GetProject(id uint, userID uint) (*model.Project, error)
}

// NewAssetService creates a new AssetService.
func NewAssetService(assets repository.AssetRepository, proj ProjectFinder) *AssetService {
	return &AssetService{assets: assets, proj: proj}
}

// ListAssets returns all assets for a project after verifying ownership.
func (s *AssetService) ListAssets(projectID, userID uint) ([]model.Asset, error) {
	if _, err := s.proj.GetProject(projectID, userID); err != nil {
		return nil, err
	}
	return s.assets.ListByProject(projectID)
}

// CreateAsset registers a new asset for a project after verifying ownership.
func (s *AssetService) CreateAsset(projectID, userID uint, asset *model.Asset) (*model.Asset, error) {
	if _, err := s.proj.GetProject(projectID, userID); err != nil {
		return nil, err
	}
	asset.ProjectID = projectID
	// 仅拦跨项目声明：storagePath 以 projects/ 开头时必须匹配本项目；
	// 其余路径（/mock/ 等单步注册调试用途）放行（工单 WO8-04）
	if strings.HasPrefix(asset.StoragePath, "projects/") &&
		!strings.HasPrefix(asset.StoragePath, fmt.Sprintf("projects/%d/", projectID)) {
		return nil, ErrInvalidStoragePath
	}
	if err := s.assets.Create(asset); err != nil {
		return nil, fmt.Errorf("failed to create asset")
	}
	return asset, nil
}

// GetAsset returns a single asset after verifying project ownership.
func (s *AssetService) GetAsset(assetID, userID uint) (*model.Asset, error) {
	asset, err := s.assets.Get(assetID)
	if err != nil {
		return nil, fmt.Errorf("asset not found")
	}
	if _, err := s.proj.GetProject(asset.ProjectID, userID); err != nil {
		return nil, fmt.Errorf("asset not found")
	}
	return asset, nil
}

// DeleteAsset removes an asset after verifying project ownership.
func (s *AssetService) DeleteAsset(assetID, userID uint) error {
	asset, err := s.assets.Get(assetID)
	if err != nil {
		return fmt.Errorf("asset not found")
	}
	if _, err := s.proj.GetProject(asset.ProjectID, userID); err != nil {
		return fmt.Errorf("asset not found")
	}
	if err := s.assets.Delete(assetID); err != nil {
		return fmt.Errorf("failed to delete asset")
	}
	return nil
}
