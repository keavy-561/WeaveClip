package database

import (
	"log/slog"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/weaveclip/server/internal/config"
	"github.com/weaveclip/server/internal/model"
)

// Connect 建立 PostgreSQL 连接并执行自动迁移
// Phase 0：连接失败不阻断启动（Mock 模式），Phase 1 起改为硬依赖
func Connect(cfg *config.Config) *gorm.DB {
	db, err := gorm.Open(postgres.Open(cfg.DSN()), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		slog.Warn("database connect failed, running in mock mode", "error", err)
		return nil
	}

	sqlDB, err := db.DB()
	if err == nil {
		sqlDB.SetMaxOpenConns(20)
		sqlDB.SetMaxIdleConns(5)
		sqlDB.SetConnMaxLifetime(time.Hour)
	}

	if err := autoMigrate(db); err != nil {
		slog.Warn("auto migrate failed", "error", err)
	}

	slog.Info("database connected", "host", cfg.Database.Host, "db", cfg.Database.DBName)
	return db
}

func autoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&model.User{},
		&model.Project{},
		&model.Asset{},
		&model.Timeline{},
		&model.Generation{},
		&model.Edit{},
		&model.Render{},
	)
}

// MockProjects 构造 Mock 模式下的示例项目数据
func MockProjects() []model.Project {
	now := time.Now()
	return []model.Project{
		{ID: 1, Name: "NYC Travel Vlog", Status: "ready", Duration: 45, AspectRatio: "9:16", Style: "energetic", CreatedAt: now.Add(-72 * time.Hour), UpdatedAt: now.Add(-48 * time.Hour)},
		{ID: 2, Name: "Product Teaser", Status: "draft", Duration: 30, AspectRatio: "16:9", Style: "cinematic", CreatedAt: now.Add(-24 * time.Hour), UpdatedAt: now.Add(-24 * time.Hour)},
		{ID: 3, Name: "Beach Day Reel", Status: "ready", Duration: 60, AspectRatio: "9:16", Style: "minimal", CreatedAt: now.Add(-96 * time.Hour), UpdatedAt: now.Add(-90 * time.Hour)},
	}
}
