package jobs

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/weaveclip/server/internal/ai"
	"github.com/weaveclip/server/internal/media"
	"github.com/weaveclip/server/internal/model"
	"github.com/weaveclip/server/internal/queue"
	"github.com/weaveclip/server/internal/render"
	"github.com/weaveclip/server/internal/storage"
	"github.com/weaveclip/server/internal/ws"
)

// aiTimeline 是 ai.DSLTimeline 的本地别名。
type aiTimeline = ai.DSLTimeline

// parseTimeline 解析时间线 JSON；失败返回 nil。
func parseTimeline(raw []byte) *ai.DSLTimeline {
	var d ai.DSLTimeline
	if err := json.Unmarshal(raw, &d); err != nil {
		return nil
	}
	return &d
}

func parsedDuration(d ai.DSLTimeline) float64 {
	if d.Duration > 0 {
		return d.Duration
	}
	return 1
}

// renderPayload 渲染任务参数。
type renderPayload struct {
	RenderID        uint             `json:"renderId"`
	ProjectID       uint             `json:"projectId"`
	TimelineVersion int              `json:"timelineVersion"`
	Resolution      string           `json:"resolution"`
	FPS             int              `json:"fps"`
	TimelineJSON    json.RawMessage  `json:"timelineJson"` // 入队时快照（原始 DSL JSON），worker 不回查 DB 也能跑
	AssetKeys       map[string]string `json:"assetKeys"`   // assetId → 存储对象 key
}

// RenderNotifier 渲染进度通知（server 内联=Hub 直推；跨进程=Redis pub/sub）。
type RenderNotifier = ws.RenderNotifier

// RenderDeps 渲染任务依赖（时间线快照在 payload 里，素材经 Store 下载）。
type RenderDeps struct {
	Renders repositoryRenderRepo
	Store   storage.Storage
	Tools   media.Tools
	ToolsOK bool
	Notify  RenderNotifier
	// NotifyFinal 终态（completed/error）专用：阻塞投递不丢弃；nil 时回退 Notify（工单 WO8-15）
	NotifyFinal  RenderNotifier
	LoadTimeline func(projectID uint, version int) ([]byte, error)
}

// repositoryRenderRepo 避免循环依赖的最小接口。
type repositoryRenderRepo interface {
	Get(id uint) (*model.Render, error)
	Update(render *model.Render) error
	// UpdateProgress 进度单列更新：进度 goroutine 与主流程并发时不再整行覆盖/竞态（工单 WO8-10）
	UpdateProgress(id uint, progress int) error
}

// HandleRender 注册渲染任务处理器。
func HandleRender(q *queue.Queue, deps RenderDeps) {
	q.Register(queue.TypeRender, deps.handleRender)
}

func (d RenderDeps) handleRender(ctx context.Context, payload []byte) error {
	var p renderPayload
	defer func() {
		// panic 转可见失败状态：renders 行永久卡 rendering 的兜底（工单 WO8-18）
		if r := recover(); r != nil {
			slog.Error("handleRender panic", "panic", r)
			if p.RenderID > 0 {
				if row, getErr := d.Renders.Get(p.RenderID); getErr == nil && row.Status != "completed" {
					row.Status = "failed"
					row.Error = fmt.Sprintf("render panic: %v", r)
					_ = d.Renders.Update(row)
					final := map[string]any{"type": "error", "renderId": p.RenderID, "error": row.Error}
					if d.NotifyFinal != nil {
						d.NotifyFinal(fmt.Sprintf("%d", p.RenderID), final)
					} else if d.Notify != nil {
						d.Notify(fmt.Sprintf("%d", p.RenderID), final)
					}
				}
			}
		}
	}()
	slog.Info("render task received", "payloadBytes", len(payload))
	if err := json.Unmarshal(payload, &p); err != nil {
		slog.Error("decode render payload failed", "error", err)
		return fmt.Errorf("decode render payload: %w", err)
	}
	renderRow, err := d.Renders.Get(p.RenderID)
	if err != nil {
		slog.Error("load render row failed", "renderId", p.RenderID, "error", err)
		return fmt.Errorf("load render %d: %w", p.RenderID, err)
	}

	// notifyFinal 终态消息（completed/error）阻塞投递不丢弃；未配置时回退进度通知（工单 WO8-15）
	notifyFinal := func(payload map[string]any) {
		if d.NotifyFinal != nil {
			d.NotifyFinal(fmt.Sprintf("%d", p.RenderID), payload)
			return
		}
		if d.Notify != nil {
			d.Notify(fmt.Sprintf("%d", p.RenderID), payload)
		}
	}
	notify := func(progress int, status, errMsg string) {
		if d.Notify != nil {
			d.Notify(fmt.Sprintf("%d", p.RenderID), map[string]any{
				"type": "progress", "renderId": p.RenderID, "progress": progress, "status": status,
			})
		}
	}
	fail := func(format string, args ...any) error {
		renderRow.Status = "failed"
		renderRow.Error = fmt.Sprintf(format, args...)
		_ = d.Renders.Update(renderRow)
		notifyFinal(map[string]any{
			"type": "error", "renderId": p.RenderID, "error": renderRow.Error,
		})
		return fmt.Errorf("%s", renderRow.Error)
	}

	renderRow.Status = "rendering"
	renderRow.Progress = 5
	_ = d.Renders.Update(renderRow)

	if !d.ToolsOK {
		return fail("ffmpeg/ffprobe not available on worker")
	}

	// 1. 时间线 JSON：payload 优先，缺则回查
	timelineRaw := p.TimelineJSON
	if len(timelineRaw) == 0 && d.LoadTimeline != nil {
		raw, err := d.LoadTimeline(p.ProjectID, p.TimelineVersion)
		if err != nil {
			return fail("load timeline: %v", err)
		}
		timelineRaw = raw
	}
	var dsl aiTimeline
	if err := json.Unmarshal(timelineRaw, &dsl); err != nil {
		return fail("invalid timeline: %v", err)
	}

	// 2. 下载素材到本地
	workDir, err := os.MkdirTemp("", "weaveclip-render-*")
	if err != nil {
		return fail("create workdir: %v", err)
	}
	defer os.RemoveAll(workDir)
	assetFiles := map[string]string{}
	for key, objectKey := range p.AssetKeys {
		local, cleanup, fetchErr := media.FetchObject(ctx, d.Store, objectKey, 2<<30)
		if fetchErr != nil {
			return fail("fetch asset %s: %v", key, fetchErr)
		}
		defer cleanup()
		assetFiles[key] = local
	}

	// 3. 编译
	width, height := 1080, 1920
	if w, h, ok := strings.Cut(p.Resolution, "x"); ok {
		if wi, e1 := strconv.Atoi(w); e1 == nil {
			width = wi
		}
		if hi, e2 := strconv.Atoi(h); e2 == nil {
			height = hi
		}
	}
	parsed := parseTimeline(timelineRaw)
	if parsed == nil {
		return fail("invalid timeline structure")
	}
	// 渲染前全量校验（含同轨无重叠）：入队快照可能来自未校验的历史数据（工单 WO8-13）
	if err := parsed.Validate(); err != nil {
		return fail("timeline validation: %v", err)
	}
	output := filepath.Join(workDir, fmt.Sprintf("render-%d.mp4", p.RenderID))
	plan, err := render.Compile(parsed, assetFiles, render.Options{
		Width: width, Height: height, FPS: p.FPS, WorkDir: workDir,
		Output: output,
	})
	if err != nil {
		return fail("compile: %v", err)
	}
	// 字幕文件
	if plan.Subtitles != "" && plan.SubtitleFile != "" {
		if err := os.WriteFile(plan.SubtitleFile, []byte(plan.Subtitles), 0o644); err != nil {
			return fail("write subtitles: %v", err)
		}
	}

	// 4. 执行 ffmpeg 并解析进度
	renderRow.Progress = 15
	_ = d.Renders.Update(renderRow)
	notify(15, "rendering", "")
	step := plan.Steps[0]
	// 在二进制名之后插入进度输出参数
	fullArgs := append([]string{step.Args[0], "-progress", "pipe:1", "-nostats"}, step.Args[1:]...)
	cmd := exec.CommandContext(ctx, fullArgs[0], fullArgs[1:]...)
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return fail("stdout pipe: %v", err)
	}
	if err := cmd.Start(); err != nil {
		return fail("start ffmpeg: %v", err)
	}
	// 读取 out_time_ms 进度：只做单列进度更新（GREATEST 单调），
	// 不再触碰主流程持有的 renderRow 结构体，消除数据竞争（工单 WO8-10）
	go func() {
		scanner := bufio.NewScanner(stdout)
		for scanner.Scan() {
			line := scanner.Text()
			if !strings.HasPrefix(line, "out_time_ms=") {
				continue
			}
			if micros, err := strconv.ParseInt(strings.TrimPrefix(line, "out_time_ms="), 10, 64); err == nil && micros > 0 {
				total := int64(parsedDuration(dsl) * 1e6)
				if total > 0 {
					pct := 15 + int(float64(micros)/float64(total)*75)
					if pct > 90 {
						pct = 90
					}
					_ = d.Renders.UpdateProgress(p.RenderID, pct)
					notify(pct, "rendering", "")
				}
			}
		}
	}()
	if err := cmd.Wait(); err != nil {
		return fail("ffmpeg: %v", err)
	}

	// 5. 产物上传 + 下载地址
	renderRow.Progress = 92
	_ = d.Renders.Update(renderRow)
	outFile, err := os.Open(output)
	if err != nil {
		return fail("open output: %v", err)
	}
	info, err := outFile.Stat()
	if err != nil {
		outFile.Close()
		return fail("stat output: %v", err)
	}
	uploadKey := fmt.Sprintf("renders/%d.mp4", p.RenderID)
	if err := d.Store.Put(ctx, uploadKey, outFile, info.Size(), "video/mp4"); err != nil {
		outFile.Close()
		return fail("upload render: %v", err)
	}
	outFile.Close()
	downloadURL, err := d.Store.PresignGet(ctx, uploadKey, 24*time.Hour)
	if err != nil {
		return fail("presign download: %v", err)
	}

	renderRow.Status = "completed"
	renderRow.Progress = 100
	renderRow.DownloadURL = downloadURL
	renderRow.FileSize = info.Size()
	now := time.Now()
	renderRow.CompletedAt = &now
	if err := d.Renders.Update(renderRow); err != nil {
		return err
	}
	notifyFinal(map[string]any{
		"type": "completed", "renderId": p.RenderID, "progress": 100, "downloadUrl": downloadURL,
		})
	}
	return nil
}
