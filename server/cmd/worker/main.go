package main

import (
	"fmt"
	"log/slog"
	"os"

	"github.com/weaveclip/server/internal/ai"
	"github.com/weaveclip/server/internal/config"
	"github.com/weaveclip/server/internal/database"
	"github.com/weaveclip/server/internal/jobs"
	"github.com/weaveclip/server/internal/media"
	"github.com/weaveclip/server/internal/queue"
	"github.com/weaveclip/server/internal/repository"
	"github.com/weaveclip/server/internal/storage"
	"github.com/weaveclip/server/internal/ws"
)

// worker 独立进程：消费 Asynq 队列中的分析/渲染任务（工单 B14/B16）。
// MOCK_MODE 下无 Redis 队列，server 内联执行任务，无需本进程。
func main() {
	_ = config.LoadEnv(".env")
	env := os.Getenv("APP_ENV")
	if env == "" {
		env = "dev"
	}
	cfg, err := config.Load(env)
	if err != nil {
		slog.Error("load config failed", "error", err)
		os.Exit(1)
	}
	if database.IsMockMode() || cfg.Redis.Addr == "" {
		slog.Warn("queue disabled (mock mode or no redis), worker exiting")
		return
	}

	// worker 不跑迁移：迁移由 server 负责，避免并发冷启动冲突
	db := database.MustConnectWithOptions(cfg, false)
	// 本地盘回退时与 server 共享同一目录（MOCK_STORAGE_DIR），
	// 保证 worker 产出对 server 的回环下载端点可见
	workerRoot := os.Getenv("MOCK_STORAGE_DIR")
	if workerRoot == "" {
		workerRoot = "./.worker-storage"
	}
	store, _, err := storage.Init(cfg.Storage, workerRoot, "", slog.Default())
	if err != nil {
		slog.Error("storage init failed", "error", err)
		os.Exit(1)
	}
	tools, toolsOK := media.LookupTools(cfg.FFmpeg.FFprobePath, cfg.FFmpeg.BinaryPath)
	if !toolsOK {
		slog.Warn("ffmpeg/ffprobe not available, analysis will degrade to skipped")
	}

	var llmClient ai.LLMClient
	if cfg.AI.AnthropicKey != "" {
		llmClient = ai.NewAnthropicClient(cfg.AI.AnthropicKey, "")
	} else {
		llmClient = ai.NewMockLLM()
	}

	q := queue.New(cfg.Redis.Addr)
	jobs.Register(q, jobs.Deps{
		Tasks:   repository.NewGormTaskResultRepo(db),
		Assets:  repository.NewGormAssetRepo(db),
		Store:   store,
		Tools:   tools,
		ToolsOK: toolsOK,
		LLM:     llmClient,
	})
	// 渲染任务：进度经 Redis pub/sub 推给 server 的 WebSocket Hub
	jobs.HandleRender(q, jobs.RenderDeps{
		Renders:  repository.NewGormRenderRepo(db),
		Store:    store,
		Tools:    tools,
		ToolsOK:  toolsOK,
		Notify:   ws.RedisNotifier(cfg.Redis.Addr),
		LoadTimeline: func(projectID uint, version int) ([]byte, error) {
			return nil, fmt.Errorf("timeline not in payload")
		},
	})

	slog.Info("worker starting", "redis", cfg.Redis.Addr, "env", env)
	if err := q.RunWorker(); err != nil {
		slog.Error("worker stopped", "error", err)
		os.Exit(1)
	}
}
