package main

import (
	"fmt"
	"log/slog"
	"os"

	"github.com/weaveclip/server/internal/config"
	"github.com/weaveclip/server/internal/database"
	"github.com/weaveclip/server/migrations"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Println("usage: migrate <up|down|status> [target_version]")
		os.Exit(1)
	}
	cmd := os.Args[1]
	target := ""
	if len(os.Args) > 2 {
		target = os.Args[2]
	}

	// 按 APP_ENV 选择配置（默认 dev）：此前硬编码 dev，对 prod 库执行迁移会用错库（工单 WO8-20）
	env := os.Getenv("APP_ENV")
	if env == "" {
		env = "dev"
	}
	cfg, err := config.Load(env)
	if err != nil {
		slog.Error("load config failed", "error", err)
		os.Exit(1)
	}

	db := database.MustConnect(cfg)
	sqlDB, err := db.DB()
	if err != nil {
		slog.Error("get db failed", "error", err)
		os.Exit(1)
	}
	defer sqlDB.Close()

	switch cmd {
	case "up":
		if err := migrations.Up(sqlDB, "migrations"); err != nil {
			slog.Error("migrate up failed", "error", err)
			os.Exit(1)
		}
	case "down":
		if err := migrations.Down(sqlDB, "migrations", target); err != nil {
			slog.Error("migrate down failed", "error", err)
			os.Exit(1)
		}
	case "status":
		if err := migrations.Status(sqlDB); err != nil {
			slog.Error("migrate status failed", "error", err)
			os.Exit(1)
		}
	default:
		fmt.Println("unknown command:", cmd)
		os.Exit(1)
	}
}
