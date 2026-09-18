package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

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
	if _, err := s.projects.GetProject(projectID, userID); err != nil {
		return nil, ErrProjectNotFound
	}
	latest, err := s.timelines.GetLatest(projectID, userID)
	if err != nil {
		if errors.Is(err, ErrTimelineNotFound) {
			return nil, ErrTimelineNotFound
		}
		return nil, err
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
		Operation:  opJSON,
		BeforeJSON: json.RawMessage(latest.TimelineJSON),
		AfterJSON:  raw,
	})
	return result, nil
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
	text, err := s.llm.Complete(ctx, chatSystem, []ai.Message{{Role: "user", Content: string(input)}})
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
