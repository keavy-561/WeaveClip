// Package jobs 异步任务处理器：server（mock 内联）与 worker（Asynq 消费）共用（工单 B16）。
package jobs

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"time"

	"github.com/weaveclip/server/internal/ai"
	"github.com/weaveclip/server/internal/media"
	"github.com/weaveclip/server/internal/model"
	"github.com/weaveclip/server/internal/queue"
	"github.com/weaveclip/server/internal/repository"
	"github.com/weaveclip/server/internal/storage"
	"gorm.io/gorm"
)

// Deps 任务处理器依赖。
type Deps struct {
	Tasks     repository.TaskResultRepository
	Assets    repository.AssetRepository
	Store     storage.Storage
	Tools     media.Tools
	ToolsOK   bool
	LLM       ai.LLMClient
	Vision    ai.VisionClient // 多模态客户端（key 缺失时为 nil，Vision 步骤降级）
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
func (d Deps) handleAnalyze(ctx context.Context, payload []byte) (err error) {
	var p analyzePayload
	// panic 转可见终态：否则 Asynq 重试耗尽后任务永久卡 running（工单 WO8-18）
	defer func() {
		if r := recover(); r != nil {
			slog.Error("handleAnalyze panic", "panic", r)
			d.markAnalyzeFailed(p.TaskResultID, fmt.Sprintf("analyze panic: %v", r))
			err = nil // 已落终态，重试同一个 panic 没有意义
		}
	}()
	if err := json.Unmarshal(payload, &p); err != nil {
		// payload 损坏不可重试（且无从定位 task 行），记录后放弃（工单 WO8-18）
		slog.Error("decode analyze payload failed", "error", err)
		return nil
	}
	task, err := d.Tasks.Get(p.TaskResultID)
	if err != nil {
		// 行不存在（被删除）时重试无意义；其余错误视为可重试（工单 WO8-18）
		if errors.Is(err, gorm.ErrRecordNotFound) {
			slog.Error("analyze task row missing", "taskResultId", p.TaskResultID)
			return nil
		}
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

// markAnalyzeFailed 把分析任务标记为 failed 终态（panic 兜底，工单 WO8-18）。
func (d Deps) markAnalyzeFailed(taskResultID uint, msg string) {
	if taskResultID == 0 {
		return
	}
	task, err := d.Tasks.Get(taskResultID)
	if err != nil {
		slog.Error("mark analyze failed: load task", "taskResultId", taskResultID, "error", err)
		return
	}
	if task.Status == "completed" || task.Status == "failed" {
		return
	}
	task.Status = "failed"
	task.Error = msg
	_ = d.Tasks.Update(task)
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

	// 3) Vision 分析（多模态 LLM 可用时）：抽帧 → 结构化内容理解
	if d.Vision == nil {
		analysis["visionStatus"] = "not configured"
	} else if visionErr := d.runVision(ctx, local, asset, analysis); visionErr != nil {
		analysis["visionStatus"] = "failed"
		analysis["visionError"] = visionErr.Error()
	} else {
		analysis["visionStatus"] = "succeeded"
	}

	d.saveAnalysis(asset, analysis)
	return out
}

// runVision 抽帧后调用多模态 LLM 产出结构化分析（strongMoments 等）。
func (d Deps) runVision(ctx context.Context, localFile string, asset *model.Asset, analysis map[string]any) error {
	total := asset.Duration
	if total <= 0 {
		total = 6
	}
	// 取三个采样点：开头/中段/后段
	seconds := []float64{0.5, total / 2, total * 0.9}
	frames, err := media.ExtractFramesAt(ctx, d.Tools, localFile, seconds)
	if err != nil {
		return err
	}
	defer media.CleanupFiles(frames)

	images := make([]ai.VisionImage, 0, len(frames))
	for _, f := range frames {
		data, err := os.ReadFile(f)
		if err != nil {
			continue
		}
		images = append(images, ai.VisionImage{Base64: base64.StdEncoding.EncodeToString(data), MediaType: "image/jpeg"})
	}
	if len(images) == 0 {
		return fmt.Errorf("no readable frames")
	}

	const visionSystem = `你是视频素材内容分析器。根据给出的采样帧输出 JSON：
{strongMoments:[{time(number,秒),reason(string)}], talkingHead(bool,是否口播人物), bRoll:[{time,reason}(空镜/转场素材)], duplicates:[{timeA,timeB}(疑似重复画面)]}。
time 以素材时长 %.1f 秒为基准估算。只输出 JSON。`
	text := fmt.Sprintf(visionSystem, total)
	out, err := d.Vision.CompleteVision(ctx, text, "素材文件名："+asset.FileName, images)
	if err != nil {
		return err
	}
	var vision map[string]any
	if err := ai.UnmarshalLooseJSON(out, &vision); err != nil {
		return fmt.Errorf("parse vision output: %w", err)
	}
	analysis["vision"] = vision
	return nil
}

func (d Deps) saveAnalysis(asset *model.Asset, analysis map[string]any) {
	b, err := json.Marshal(analysis)
	if err != nil {
		slog.Error("marshal analysis", "assetId", asset.ID, "error", err)
		return
	}
	// 单列更新：分析耗时最长数分钟，整行回写会覆盖上传管线并发写入的
	// metadata/探针字段（工单 WO8-10）
	if err := d.Assets.UpdateAnalysis(asset.ID, b); err != nil {
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
