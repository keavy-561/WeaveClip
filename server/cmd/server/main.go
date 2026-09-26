package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

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
	"github.com/weaveclip/server/internal/ws"
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
	// 占位符字面量（${JWT_SECRET} 未被环境变量解析）视同未配置，防止出现跨部署可预测的密钥（工单 WO11-06）
	if cfg.JWT.Secret == "" || strings.Contains(cfg.JWT.Secret, "${") {
		slog.Error("JWT_SECRET is required; unresolved ${VAR} placeholder is rejected")
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

	// 生产防护（工单 WO11-06/07）：prod 禁止本地磁盘回落（回落会注册无鉴权直传端点）、
	// 禁止 MOCK_MODE；CORS 未配置时大声警告
	if env == "prod" && mockStorageRoot != "" {
		slog.Error("APP_ENV=prod requires object storage (MinIO/S3); local-disk fallback is rejected")
		os.Exit(1)
	}
	if database.IsMockMode() && env == "prod" {
		slog.Error("MOCK_MODE cannot be enabled with APP_ENV=prod")
		os.Exit(1)
	}
	if len(cfg.CORS.AllowedOrigins) == 0 {
		slog.Warn("CORS allowed_origins is empty: all origins allowed; configure cors.allowed_origins for production")
	}

	// HTTP 服务
	r := gin.New()
	r.Use(gin.Recovery(), middleware.Recover(), middleware.RequestID(), middleware.Logger(),
		middleware.CORS(cfg.CORS.AllowedOrigins), middleware.Security(),
		// 限流（每 IP 令牌桶）与请求体上限：JSON 接口 10MB；大文件直传与 WS 豁免（工单 WO11-04）
		middleware.BodyLimit(10<<20), middleware.RateLimit(20, 40),
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
	var visionClient ai.VisionClient
	if _, isMock := llmClient.(*ai.MockLLM); !isMock {
		visionClient = llmClient.(ai.VisionClient)
	}
	jobs.Register(taskQueue, jobs.Deps{
		Tasks:   taskRepo,
		Assets:  assetRepo,
		Store:   store,
		Tools:   tools,
		ToolsOK: toolsOK,
		LLM:     llmClient,
		Vision:  visionClient,
	})
	analyzeService := service.NewAnalyzeService(taskRepo, projectService, assetRepo, taskQueue)
	analyzeHandler := handler.NewAnalyzeHandler(analyzeService)

	// 渲染链路 + WebSocket（B18/B19）
	hub := ws.NewHub()
	var renderRepo repository.RenderRepository
	if db != nil {
		renderRepo = repository.NewGormRenderRepo(db)
	} else {
		renderRepo = repository.NewMockRenderRepo()
	}
	var renderNotifier ws.RenderNotifier
	var renderNotifyFinal ws.RenderNotifier
	if database.IsMockMode() {
		// mock 内联执行：Hub 本进程直推（终态用阻塞投递，工单 WO8-15）
		renderNotifier = hub.Broadcast
		renderNotifyFinal = hub.BroadcastBlocking
	} else {
		// worker 跨进程执行：Redis pub/sub → 桥接 → Hub
		renderNotifier = ws.RedisNotifier(cfg.Redis.Addr)
		renderNotifyFinal = ws.RedisNotifier(cfg.Redis.Addr)
		go ws.StartRedisBridge(cfg.Redis.Addr, hub)
	}
	jobs.HandleRender(taskQueue, jobs.RenderDeps{
		Renders:     renderRepo,
		Store:       store,
		Tools:       tools,
		ToolsOK:     toolsOK,
		Notify:      renderNotifier,
		NotifyFinal: renderNotifyFinal,
		LoadTimeline: func(projectID uint, version int) ([]byte, error) {
			t, err := timelineService.GetVersionInternal(projectID, version)
			if err != nil {
				return nil, err
			}
			return []byte(t.TimelineJSON), nil
		},
	})
	renderService := service.NewRenderService(renderRepo, projectService, timelineService, assetRepo, taskQueue)
	renderHandler := handler.NewRenderHandler(renderService, store)
	wsHandler := handler.NewWSHandler(hub, renderRepo, projectService)

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
			projects.POST("/:id/render", renderHandler.Start)
		}
		api.GET("/assets/:id", middleware.Auth(), assetHandler.Get)
		api.DELETE("/assets/:id", middleware.Auth(), assetHandler.Delete)
		api.GET("/generations/:id", middleware.Auth(), generateHandler.Get)
		api.GET("/renders/:id", middleware.Auth(), renderHandler.Get)
	}

	// WebSocket 渲染进度（D2 裁定路径）
	r.GET("/ws/render/:renderId", middleware.WSQueryAuth(), wsHandler.Render)

	addr := fmt.Sprintf(":%d", cfg.Server.Port)
	slog.Info("server starting", "addr", addr, "env", env, "mode", cfg.Server.Mode)

	// 优雅停机（工单 WO11-03）：SIGINT/SIGTERM 后停止接收新请求，等待在途请求完成（15s 上限）
	srv := &http.Server{Addr: addr, Handler: r}
	go func() {
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("server stopped", "error", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	slog.Info("server shutting down")
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		slog.Error("server shutdown error", "error", err)
	}
	slog.Info("server exited")
}
