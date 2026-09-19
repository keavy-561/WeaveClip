// Package jobs 异步任务处理器：server（mock 内联）与 worker（Asynq 消费）共用（工单 B16）。
package jobs

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"os/exec"
	"time"

	"github.com/weaveclip/server/internal/ai"
	"github.com/weaveclip/server/internal/media"
	"github.com/weaveclip/server/internal/model"
	"github.com/weaveclip/server/internal/queue"
	"github.com/weaveclip/server/internal/repository"
	"github.com/weaveclip/server/internal/storage"
)

// Deps 任务处理器依赖。
type Deps struct {
	Tasks     repository.TaskResultRepository
	Assets    repository.AssetRepository
	Store     storage.Storage
	Tools     media.Tools
	ToolsOK   bool
	LLM       ai.LLMClient
	FetchMax  int64
}

// Register 把所有任务处理器注册到队列。
func Register(q *queue.Queue, deps Deps) {
	q.Register(queue.TypeAnalyze, deps.handleAnalyze)
}

// analyzePayload analyze 任务参数。
type analyzePayload struct {
	TaskResultID uint   `json:"taskResultId"`
	ProjectID    uint   `json:"projectId"`
	AssetIDs     []uint `json:"assetIds"`
}

// handleAnalyze 分析任务：对每个视频素材做场景检测（ffmpeg）+ ASR（whisper，可选）+ Vision（可选），
// 结果聚合写入 assets.analysis 与 task_results。
func (d Deps) handleAnalyze(ctx context.Context, payload []byte) error {
	var p analyzePayload
	if err := json.Unmarshal(payload, &p); err != nil {
		return fmt.Errorf("decode analyze payload: %w", err)
	}
	task, err := d.Tasks.Get(p.TaskResultID)
	if err != nil {
		return fmt.Errorf("load task result %d: %w", p.TaskResultID, err)
	}
	task.Status = "running"
	task.Progress = 5
	_ = d.Tasks.Update(task)

	total := len(p.AssetIDs)
	results := make([]map[string]any, 0, total)
	failed := 0
	for i, assetID := range p.AssetIDs {
		asset, err := d.Assets.Get(assetID)
		if err != nil {
			results = append(results, map[string]any{"assetId": assetID, "status": "not_found"})
			failed++
			continue
		}
		assetResult := d.analyzeAsset(ctx, asset)
		if assetResult["status"] == "failed" {
			failed++
		}
		results = append(results, assetResult)

		// 进度落库（80% 留给收尾）
		task.Progress = 5 + (i+1)*75/maxInt(total, 1)
		_ = d.Tasks.Update(task)
	}

	task.Status = "completed"
	if failed == total && total > 0 {
		task.Status = "failed"
		task.Error = "all assets failed to analyze"
	}
	task.Progress = 100
	task.Result = mustJSON(map[string]any{"assets": results})
	return d.Tasks.Update(task)
}

// analyzeAsset 处理单个素材；失败记录在返回值中而不中断整个任务。
func (d Deps) analyzeAsset(ctx context.Context, asset *model.Asset) map[string]any {
	out := map[string]any{"assetId": asset.ID, "status": "processed"}
	analysis := map[string]any{"processedAt": time.Now().UTC().Format(time.RFC3339)}

	if asset.Type != "video" {
		analysis["status"] = "skipped"
		analysis["reason"] = "only video assets are analyzed"
		out["status"] = "skipped"
		d.saveAnalysis(asset, analysis)
		return out
	}
	if !d.ToolsOK {
		analysis["status"] = "skipped"
		analysis["reason"] = "ffmpeg/ffprobe not available"
		out["status"] = "skipped"
		d.saveAnalysis(asset, analysis)
		return out
	}

	local, cleanup, err := media.FetchObject(ctx, d.Store, asset.StoragePath, d.fetchMax())
	if err != nil {
		analysis["status"] = "failed"
		analysis["error"] = err.Error()
		out["status"] = "failed"
		d.saveAnalysis(asset, analysis)
		return out
	}
	defer cleanup()

	// 1) 场景检测
	scenes, sceneErr := media.DetectScenes(ctx, d.Tools, local)
	if sceneErr != nil {
		analysis["scenesError"] = sceneErr.Error()
	} else {
		analysis["scenes"] = scenes
		analysis["clipsAnalyzed"] = len(scenes)
	}

	// 2) Whisper ASR（工具存在时）
	if whisperPath, err := exec.LookPath("whisper"); err == nil {
		transcript, asrErr := media.Transcribe(ctx, whisperPath, local)
		if asrErr != nil {
			analysis["transcriptError"] = asrErr.Error()
		} else if transcript != nil {
			analysis["transcript"] = transcript
		}
	} else {
		analysis["transcriptStatus"] = "whisper not available"
	}

	// 3) Vision 分析（需要多模态 LLM，key 缺失时记录降级）
	analysis["visionStatus"] = "not configured"

	d.saveAnalysis(asset, analysis)
	return out
}

func (d Deps) saveAnalysis(asset *model.Asset, analysis map[string]any) {
	b, err := json.Marshal(analysis)
	if err != nil {
		slog.Error("marshal analysis", "assetId", asset.ID, "error", err)
		return
	}
	asset.Analysis = b
	if err := d.Assets.Update(asset); err != nil {
		slog.Error("save analysis", "assetId", asset.ID, "error", err)
	}
}

func (d Deps) fetchMax() int64 {
	if d.FetchMax > 0 {
		return d.FetchMax
	}
	return 500 << 20
}

func mustJSON(v any) []byte {
	b, err := json.Marshal(v)
	if err != nil {
		return []byte(`{}`)
	}
	return b
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}
