package main

import (
	"fmt"
	"log/slog"
	"os"

	"github.com/gin-gonic/gin"

	"github.com/weaveclip/server/internal/config"
	"github.com/weaveclip/server/internal/database"
	"github.com/weaveclip/server/internal/handler"
	"github.com/weaveclip/server/internal/middleware"
)

func main() {
	// 环境配置：默认 dev
	env := os.Getenv("APP_ENV")
	if env == "" {
		env = "dev"
	}

	cfg, err := config.Load(env)
	if err != nil {
		slog.Error("load config failed", "error", err)
		os.Exit(1)
	}

	gin.SetMode(cfg.Server.Mode)

	// 数据库（Phase 0：连接失败自动降级为 Mock 模式）
	db := database.Connect(cfg)

	// HTTP 服务
	r := gin.New()
	r.Use(gin.Recovery(), middleware.Logger(), middleware.CORS())

	// Handlers
	healthHandler := handler.NewHealthHandler()
	projectHandler := handler.NewProjectHandler(db)

	// 路由注册
	api := r.Group("/api")
	{
		api.GET("/health", healthHandler.Check)

		projects := api.Group("/projects")
		{
			projects.GET("", projectHandler.List)
			projects.POST("", projectHandler.Create)
			projects.GET("/:id", projectHandler.Get)
			projects.DELETE("/:id", projectHandler.Delete)

			// Phase 1+: assets / analyze / generate / chat / render
		}
	}

	addr := fmt.Sprintf(":%d", cfg.Server.Port)
	slog.Info("server starting", "addr", addr, "env", env, "mode", cfg.Server.Mode)
	if err := r.Run(addr); err != nil {
		slog.Error("server stopped", "error", err)
		os.Exit(1)
	}
}
