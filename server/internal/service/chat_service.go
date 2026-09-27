package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"gorm.io/datatypes"

	"github.com/weaveclip/server/internal/ai"
	"github.com/weaveclip/server/internal/model"
	"github.com/weaveclip/server/internal/repository"
)

// ChatService 对话式编辑（工单 B13）。
type ChatService struct {
	projects  ProjectFinder
	assets    repository.AssetRepository
	timelines *TimelineService
	edits     repository.EditRepository
	llm       ai.LLMClient
	// mock 启发式：LLM 为 MockLLM 时用关键词规则生成操作（便于前端联调）
	mockHeuristic bool
}

// NewChatService 创建对话编辑服务。
func NewChatService(projects ProjectFinder, assets repository.AssetRepository,
	timelines *TimelineService, edits repository.EditRepository, llm ai.LLMClient) *ChatService {
	_, isMock := llm.(*ai.MockLLM)
	return &ChatService{
		projects: projects, assets: assets, timelines: timelines, edits: edits, llm: llm,
		mockHeuristic: isMock,
	}
}

// ChatResult 对话编辑结果。
type ChatResult struct {
	Reply      string          `json:"message"`
	Operations []ai.Operation  `json:"operations"`
	Timeline   *model.Timeline `json:"-"` // 无修改时为 nil
}

// Chat 处理一条对话编辑指令。
func (s *ChatService) Chat(projectID, userID uint, message, selectedClipID string) (*ChatResult, error) {
	project, err := s.projects.GetProject(projectID, userID)
	if err != nil {
		return nil, ErrProjectNotFound
	}
	latest, err := s.timelines.GetLatest(projectID, userID)
	if err != nil {
		if !errors.Is(err, ErrTimelineNotFound) {
			return nil, err
		}
		// 新项目尚未保存过时间线：自动初始化一条空时间线，让对话编辑开箱即用。
		// 此前直接返回 ErrTimelineNotFound，编辑器 AI 面板对新项目完全不可用。
		latest, err = s.initEmptyTimeline(projectID, project.Duration)
		if err != nil {
			return nil, err
		}
	}
	assets, err := s.assets.ListByProject(projectID)
	if err != nil {
		return nil, err
	}

	var dsl ai.DSLTimeline
	if err := json.Unmarshal(latest.TimelineJSON, &dsl); err != nil {
		return nil, fmt.Errorf("stored timeline invalid: %w", err)
	}

	var output *ai.ChatAgentOutput
	if s.mockHeuristic {
		output = heuristicChat(message, selectedClipID, &dsl, assets)
	} else {
		output, err = s.llmChat(&dsl, assets, message, selectedClipID)
		if err != nil {
			return nil, err
		}
	}

	result := &ChatResult{Reply: output.Message, Operations: output.Operations}
	if len(output.Operations) == 0 {
		return result, nil
	}

	newDSL, err := ai.ApplyOperations(&dsl, output.Operations)
	if err != nil {
		return nil, fmt.Errorf("apply operations: %w", err)
	}
	// 应用后的时间线必须可直接渲染：全量校验（含同轨无重叠），LLM 产出非法时
	// 明确报错而不是把脏数据落库（工单 WO8-13）
	if err := newDSL.Validate(); err != nil {
		return nil, fmt.Errorf("applied timeline invalid: %w", err)
	}
	raw, err := newDSL.Marshal()
	if err != nil {
		return nil, err
	}
	timeline, err := s.timelines.SaveInternal(projectID, raw, "AI chat edit")
	if err != nil {
		return nil, err
	}
	result.Timeline = timeline

	// 记录编辑历史（Phase 3 验收：每次编辑写入 edits 表）
	opJSON, _ := json.Marshal(output.Operations)
	_ = s.edits.Create(&model.Edit{
		ProjectID:  projectID,
		Message:    message,
		Operation:  datatypes.JSON(opJSON),
		BeforeJSON: datatypes.JSON(latest.TimelineJSON),
		AfterJSON:  datatypes.JSON(raw),
	})
	return result, nil
}

// initEmptyTimeline 为尚无持久化时间线的项目创建版本 1 空时间线。
// 时长取项目目标时长，非法时回退 30s（DSL 校验要求 duration > 0）。
func (s *ChatService) initEmptyTimeline(projectID uint, duration int) (*model.Timeline, error) {
	if duration <= 0 {
		duration = 30
	}
	empty := ai.DSLTimeline{
		Version:  "1.0",
		FPS:      30,
		Duration: float64(duration),
		Canvas:   ai.DSLCanvas{Width: 1080, Height: 1920},
		Tracks:   []ai.DSLTrack{},
	}
	raw, err := empty.Marshal()
	if err != nil {
		return nil, err
	}
	return s.timelines.SaveInternal(projectID, raw, "initial empty timeline")
}

func (s *ChatService) llmChat(dsl *ai.DSLTimeline, assets []model.Asset, message, selectedClipID string) (*ai.ChatAgentOutput, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Minute)
	defer cancel()
	input, err := json.Marshal(map[string]any{
		"timeline":       dsl,
		"assets":         ai.SummarizeAssets(assets),
		"selectedClipId": selectedClipID,
		"message":        message,
	})
	if err != nil {
		return nil, err
	}
	text, err := s.llm.Complete(ctx, ai.ChatSystem, []ai.Message{{Role: "user", Content: string(input)}})
	if err != nil {
		return nil, fmt.Errorf("chat llm: %w", err)
	}
	return ai.ParseChatAgentOutput(text)
}

// heuristicChat mock 模式：按关键词生成确定性操作，便于前端联调。
func heuristicChat(message, selectedClipID string, dsl *ai.DSLTimeline, assets []model.Asset) *ai.ChatAgentOutput {
	msg := strings.ToLower(message)
	out := &ai.ChatAgentOutput{Operations: []ai.Operation{}}

	// 选中的片段：优先 selectedClipID，否则取 video 轨最后一个
	clipID := selectedClipID
	if clipID == "" && len(dsl.Tracks) > 0 {
		for ti := len(dsl.Tracks) - 1; ti >= 0; ti-- {
			if dsl.Tracks[ti].Type == "video" && len(dsl.Tracks[ti].Clips) > 0 {
				clipID = dsl.Tracks[ti].Clips[len(dsl.Tracks[ti].Clips)-1].ID
				break
			}
		}
	}

	// 空时间轴（新项目自动初始化为空）没有可操作的片段：clip 级指令直接给引导，
	// 不产出找不到片段的 operation（ApplyOperations 会报错，整条对话 500）
	if clipID == "" && targetsClipOp(msg) {
		out.Message = "时间轴还是空的，先拖入素材再让我编辑片段。"
		return out
	}

	switch {
	case strings.Contains(msg, "删") || strings.Contains(msg, "delete"):
		out.Operations = append(out.Operations, ai.Operation{Type: "delete", ClipID: clipID})
		out.Message = "已删除片段（mock）"
	case strings.Contains(msg, "缩短") || strings.Contains(msg, "trim"):
		one := 1.0
		three := 3.0
		out.Operations = append(out.Operations, ai.Operation{Type: "trim", ClipID: clipID, TrimIn: &one, TrimOut: &three})
		out.Message = "已把片段修剪为 2 秒（mock）"
	case strings.Contains(msg, "换") || strings.Contains(msg, "replace"):
		if len(assets) > 0 {
			out.Operations = append(out.Operations, ai.Operation{
				Type: "replace", ClipID: clipID, AssetID: fmt.Sprintf("%d", assets[0].ID)})
			out.Message = "已替换片段素材（mock）"
		}
	case strings.Contains(msg, "字幕") || strings.Contains(msg, "caption"):
		out.Operations = append(out.Operations, ai.Operation{Type: "add_caption", ClipID: clipID, Caption: message})
		out.Message = "已添加字幕（mock）"
	case strings.Contains(msg, "开头") || strings.Contains(msg, "reorder"):
		zero := 0
		out.Operations = append(out.Operations, ai.Operation{Type: "reorder", ClipID: clipID, NewIndex: &zero})
		out.Message = "已把片段移到开头（mock）"
	default:
		out.Message = "收到！这是 mock 模式的回复，配置 ANTHROPIC_API_KEY 后可获得真实的 AI 编辑能力。"
	}
	return out
}

// targetsClipOp 判断消息是否指向片段级操作。删/修剪/替换/重排/加字幕五类
// operation 都要求目标片段存在（ApplyOperations 对找不到的片段直接报错）。
func targetsClipOp(msg string) bool {
	return strings.Contains(msg, "删") || strings.Contains(msg, "delete") ||
		strings.Contains(msg, "缩短") || strings.Contains(msg, "trim") ||
		strings.Contains(msg, "换") || strings.Contains(msg, "replace") ||
		strings.Contains(msg, "开头") || strings.Contains(msg, "reorder") ||
		strings.Contains(msg, "字幕") || strings.Contains(msg, "caption")
}
