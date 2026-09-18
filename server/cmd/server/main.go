package main

import (
	"fmt"
	"log/slog"
	"os"

	"github.com/gin-gonic/gin"

	"github.com/weaveclip/server/internal/ai"
	"github.com/weaveclip/server/internal/config"
	"github.com/weaveclip/server/internal/database"
	"github.com/weaveclip/server/internal/handler"
	"github.com/weaveclip/server/internal/jobs"
	"github.com/weaveclip/server/internal/media"
	"github.com/weaveclip/server/internal/middleware"
	"github.com/weaveclip/server/internal/queue"
	"github.com/weaveclip/server/internal/repository"
	"github.com/weaveclip/server/internal/service"
	"github.com/weaveclip/server/internal/storage"
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

	// 对象存储（B05）：优先 MinIO；不可用或 mock 模式回落本地磁盘存储
	mockRoot := os.Getenv("MOCK_STORAGE_DIR")
	if mockRoot == "" {
		mockRoot = "./.mock-storage"
	}
	store, mockStorageRoot, err := storage.Init(cfg.Storage, mockRoot, os.Getenv("MOCK_STORAGE_PUBLIC_BASE"), slog.Default())
	if err != nil {
		slog.Error("storage init failed", "error", err)
		os.Exit(1)
	}

	// HTTP 服务
	r := gin.New()
	r.Use(gin.Recovery(), middleware.Recover(), middleware.RequestID(), middleware.Logger(),
		middleware.CORS(cfg.CORS.AllowedOrigins), middleware.Security(),
		middleware.RequestTimeout(cfg.EffectiveRequestTimeout()))

	// Handlers
	healthHandler := handler.NewHealthHandler(db, cfg.Redis.Addr, store)

	// Project 仓库 + 服务（分层治理：handler 不再直连 DB）
	var projectRepo repository.ProjectRepository
	if db != nil {
		projectRepo = repository.NewGormProjectRepo(db)
	} else {
		projectRepo = repository.NewMockProjectRepo()
	}
	projectService := service.NewProjectService(projectRepo)
	projectHandler := handler.NewProjectHandler(projectService)

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
	assetService := service.NewAssetService(assetRepo, projectService)
	uploadService := service.NewUploadService(assetRepo, projectService, store,
		cfg.FFmpeg.FFprobePath, cfg.FFmpeg.BinaryPath)
	assetHandler := handler.NewAssetHandler(assetService, uploadService)

	// Timeline 版本化持久化（B09）
	var timelineRepo repository.TimelineRepository
	if db != nil {
		timelineRepo = repository.NewGormTimelineRepo(db)
	} else {
		timelineRepo = repository.NewMockTimelineRepo()
	}
	timelineService := service.NewTimelineService(timelineRepo, projectService)
	timelineHandler := handler.NewTimelineHandler(timelineService)

	// AI 链路（B10-B13）：有 key 走真实 LLM，否则 mock 客户端 + 启发式
	var llmClient ai.LLMClient
	if cfg.AI.AnthropicKey != "" {
		llmClient = ai.NewAnthropicClient(cfg.AI.AnthropicKey, "")
	} else {
		llmClient = ai.NewMockLLM()
	}
	pipeline := ai.NewPipeline(llmClient)
	if _, isMock := llmClient.(*ai.MockLLM); isMock {
		pipeline.EnableHeuristic = true
	}

	var generationRepo repository.GenerationRepository
	if db != nil {
		generationRepo = repository.NewGormGenerationRepo(db)
	} else {
		generationRepo = repository.NewMockGenerationRepo()
	}
	generateService := service.NewGenerateService(generationRepo, projectService, assetRepo, timelineService, pipeline)
	generateHandler := handler.NewGenerateHandler(generateService)

	var editRepo repository.EditRepository
	if db != nil {
		editRepo = repository.NewGormEditRepo(db)
	} else {
		editRepo = repository.NewMockEditRepo()
	}
	chatService := service.NewChatService(projectService, assetRepo, timelineService, editRepo, llmClient)
	chatHandler := handler.NewChatHandler(chatService)

	// 异步任务队列（B14/B15）：mock 模式内联执行，真实模式仅入队由 worker 消费
	var taskQueue *queue.Queue
	if database.IsMockMode() {
		taskQueue = queue.New("") // 空地址 = 内联执行器
	} else {
		taskQueue = queue.New(cfg.Redis.Addr)
	}
	var taskRepo repository.TaskResultRepository
	if db != nil {
		taskRepo = repository.NewGormTaskResultRepo(db)
	} else {
		taskRepo = repository.NewMockTaskResultRepo()
	}
	tools, toolsOK := media.LookupTools(cfg.FFmpeg.FFprobePath, cfg.FFmpeg.BinaryPath)
	jobs.Register(taskQueue, jobs.Deps{
		Tasks:   taskRepo,
		Assets:  assetRepo,
		Store:   store,
		Tools:   tools,
		ToolsOK: toolsOK,
		LLM:     llmClient,
	})
	analyzeService := service.NewAnalyzeService(taskRepo, projectService, assetRepo, taskQueue)
	analyzeHandler := handler.NewAnalyzeHandler(analyzeService)

	// 路由注册
	api := r.Group("/api")
	{
		api.GET("/health", healthHandler.Check)

		// 本地磁盘存储的回环直传端点（仅 mock 存储模式注册）
		if mockStorageRoot != "" {
			msHandler := handler.NewMockStorageHandler(mockStorageRoot)
			api.Any("/mock-storage/*key", msHandler.Handle)
		}

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
			projects.PATCH("/:id", projectHandler.Update)
			projects.DELETE("/:id", projectHandler.Delete)
			projects.GET("/:id/assets", assetHandler.List)
			projects.POST("/:id/assets", assetHandler.Create)
			projects.POST("/:id/assets/presign", assetHandler.Presign)
			projects.POST("/:id/assets/confirm", assetHandler.Confirm)
			projects.GET("/:id/timeline", timelineHandler.Get)
			projects.GET("/:id/timeline/versions", timelineHandler.ListVersions)
			projects.PUT("/:id/timeline", timelineHandler.Save)
			projects.POST("/:id/generate", generateHandler.Start)
			projects.POST("/:id/chat", chatHandler.Chat)
			projects.POST("/:id/analyze", analyzeHandler.Start)
			projects.GET("/:id/analysis", analyzeHandler.Status)

			// Phase 4: analyze / Phase 5: render 接入后补充
		}
		api.GET("/assets/:id", middleware.Auth(), assetHandler.Get)
		api.DELETE("/assets/:id", middleware.Auth(), assetHandler.Delete)
		api.GET("/generations/:id", middleware.Auth(), generateHandler.Get)
	}

	addr := fmt.Sprintf(":%d", cfg.Server.Port)
	slog.Info("server starting", "addr", addr, "env", env, "mode", cfg.Server.Mode)
	if err := r.Run(addr); err != nil {
		slog.Error("server stopped", "error", err)
		os.Exit(1)
	}
}
