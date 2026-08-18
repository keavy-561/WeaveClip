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
	"github.com/weaveclip/server/internal/repository"
	"github.com/weaveclip/server/internal/service"
)

func main() {
	// Load .env if present (does not override existing env vars)
	_ = config.LoadEnv(".env")

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

	// JWT must be initialized for auth endpoints to work
	if cfg.JWT.Secret == "" {
		slog.Error("JWT_SECRET is required")
		os.Exit(1)
	}
	middleware.InitJWT(cfg.JWT.Secret, cfg.JWT.Expiry)

	// Database (non-mock: exit on failure; mock: return nil)
	db := database.MustConnect(cfg)

	// HTTP 服务
	r := gin.New()
	r.Use(gin.Recovery(), middleware.Recover(), middleware.RequestID(), middleware.Logger(), middleware.CORS(cfg.CORS.AllowedOrigins))

	// Handlers
	healthHandler := handler.NewHealthHandler()
	projectHandler := handler.NewProjectHandler(db)

	var userRepo service.UserRepository
	if db != nil {
		userRepo = service.NewGormUserRepo(db)
	} else {
		userRepo = service.NewMockUserRepo()
	}
	authService := service.NewAuthService(userRepo)
	authHandler := handler.NewAuthHandler(authService)

	var assetRepo repository.AssetRepository
	if db != nil {
		assetRepo = repository.NewGormAssetRepo(db)
	} else {
		assetRepo = repository.NewMockAssetRepo(handler.MockAssets())
	}
	assetService := service.NewAssetService(assetRepo, projectHandler)
	assetHandler := handler.NewAssetHandler(assetService)

	// 路由注册
	api := r.Group("/api")
	{
		api.GET("/health", healthHandler.Check)

		auth := api.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.GET("/me", middleware.Auth(), authHandler.Me)
		}

			projects := api.Group("/projects")
			projects.Use(middleware.Auth())
			{
				projects.GET("", projectHandler.List)
				projects.POST("", projectHandler.Create)
				projects.GET("/:id", projectHandler.Get)
				projects.DELETE("/:id", projectHandler.Delete)

				assets := projects.Group("/:projectId/assets")
				assets.Use(middleware.Auth())
				{
					assets.GET("", assetHandler.List)
					assets.POST("", assetHandler.Create)
					assets.GET("/:id", assetHandler.Get)
					assets.DELETE("/:id", assetHandler.Delete)
				}

				// Phase 1+: analyze / generate / chat / render
			}
	}

	addr := fmt.Sprintf(":%d", cfg.Server.Port)
	slog.Info("server starting", "addr", addr, "env", env, "mode", cfg.Server.Mode)
	if err := r.Run(addr); err != nil {
		slog.Error("server stopped", "error", err)
		os.Exit(1)
	}
}
