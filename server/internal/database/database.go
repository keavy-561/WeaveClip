package database

import (
	"fmt"
	"log/slog"
	"os"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/weaveclip/server/internal/config"
	"github.com/weaveclip/server/internal/model"
	"github.com/weaveclip/server/migrations"
)

// Connect establishes a PostgreSQL connection and runs versioned migrations.
// In non-mock mode, connection failure causes an immediate exit.
// In mock mode (MOCK_MODE=true), it returns nil without attempting connection.
func Connect(cfg *config.Config) (*gorm.DB, error) {
	if isMockMode() {
		slog.Warn("MOCK_MODE enabled, skipping database connection")
		return nil, nil
	}

	db, err := gorm.Open(postgres.Open(cfg.DSN()), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		return nil, fmt.Errorf("database connect failed: %w", err)
	}

	sqlDB, err := db.DB()
	if err == nil {
		sqlDB.SetMaxOpenConns(20)
		sqlDB.SetMaxIdleConns(5)
		sqlDB.SetConnMaxLifetime(time.Hour)
	}

	// Run versioned migrations instead of autoMigrate
	if err := runMigrations(db); err != nil {
		return nil, fmt.Errorf("migrations failed: %w", err)
	}

	slog.Info("database connected", "host", cfg.Database.Host, "db", cfg.Database.DBName)
	return db, nil
}

func runMigrations(db *gorm.DB) error {
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	migrationsDir := "migrations"
	if _, err := os.Stat(migrationsDir); os.IsNotExist(err) {
		slog.Warn("migrations directory not found, skipping migrations")
		return nil
	}
	if err := migrations.Up(sqlDB, migrationsDir); err != nil {
		return err
	}
	return nil
}

// MustConnect is like Connect but exits the process on failure in non-mock mode.
func MustConnect(cfg *config.Config) *gorm.DB {
	db, err := Connect(cfg)
	if err != nil {
		slog.Error("database connection required but failed", "error", err)
		fmt.Fprintf(os.Stderr, "FATAL: %v\n", err)
		os.Exit(1)
	}
	return db
}

func isMockMode() bool {
	return os.Getenv("MOCK_MODE") == "true"
}

// IsMockMode reports whether MOCK_MODE is enabled.
func IsMockMode() bool {
	return isMockMode()
}

// MockProjects constructs mock project data for fallback.
func MockProjects() []model.Project {
	now := time.Now()
	return []model.Project{
		{ID: 1, Name: "NYC Travel Vlog", UserID: 1, Status: "ready", Duration: 45, AspectRatio: "9:16", Style: "energetic", CreatedAt: now.Add(-72 * time.Hour), UpdatedAt: now.Add(-48 * time.Hour)},
		{ID: 2, Name: "Product Teaser", UserID: 1, Status: "draft", Duration: 30, AspectRatio: "16:9", Style: "cinematic", CreatedAt: now.Add(-24 * time.Hour), UpdatedAt: now.Add(-24 * time.Hour)},
		{ID: 3, Name: "Beach Day Reel", UserID: 1, Status: "ready", Duration: 60, AspectRatio: "9:16", Style: "minimal", CreatedAt: now.Add(-96 * time.Hour), UpdatedAt: now.Add(-90 * time.Hour)},
	}
}
