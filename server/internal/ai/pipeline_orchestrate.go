package ai

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/weaveclip/server/internal/model"
)

// Pipeline 五组件编排：IntentParser → PlanningAgent → AssetRetriever → EditingAgent → Validator。
type Pipeline struct {
	intent    *IntentParser
	planner   *PlanningAgent
	retriever *AssetRetriever
	editor    *EditingAgent
	// mock 启发式：LLM 为 MockLLM 且 EnableHeuristic 时走确定性生成（不依赖模型质量）
	EnableHeuristic bool
}

// NewPipeline 创建编排器。
func NewPipeline(llm LLMClient) *Pipeline {
	return &Pipeline{
		intent:    NewIntentParser(llm),
		planner:   NewPlanningAgent(llm),
		retriever: NewAssetRetriever(),
		editor:    NewEditingAgent(llm),
	}
}

// GenerateResult 一次生成的产物。
type GenerateResult struct {
	Intent   *Intent
	Plan     *Plan
	DSL      *DSLTimeline
	DSLRaw   json.RawMessage
}

// Run 执行完整管线。
func (p *Pipeline) Run(ctx context.Context, prompt string, assets []model.Asset) (*GenerateResult, error) {
	if len(assets) == 0 {
		return nil, fmt.Errorf("no assets to generate from")
	}
	intent, err := p.intent.Parse(ctx, prompt)
	if err != nil {
		return nil, err
	}
	candidates := p.retriever.Retrieve(intent, assets)

	var plan *Plan
	var raw json.RawMessage
	if p.EnableHeuristic {
		plan = heuristicPlan(intent, candidates)
		raw, err = heuristicDSL(intent, candidates)
	} else {
		plan, err = p.planner.Plan(ctx, intent, candidates)
		if err != nil {
			return nil, err
		}
		raw, err = p.editor.GenerateDSL(ctx, intent, plan, candidates)
	}
	if err != nil {
		return nil, err
	}

	// 组件 5/5：Validator（结构 + 时间轴约束）
	var dsl DSLTimeline
	if err := json.Unmarshal(raw, &dsl); err != nil {
		return nil, fmt.Errorf("validator: %w", err)
	}
	if err := dsl.Validate(); err != nil {
		return nil, fmt.Errorf("validator: %w", err)
	}
	return &GenerateResult{Intent: intent, Plan: plan, DSL: &dsl, DSLRaw: raw}, nil
}

// heuristicPlan mock 模式的确定性计划：按顺序取素材均分目标时长。
func heuristicPlan(intent *Intent, assets []model.Asset) *Plan {
	plan := &Plan{Segments: []PlanSegment{}}
	n := len(assets)
	if n == 0 {
		return plan
	}
	perAsset := intent.TargetDuration / float64(n)
	for _, a := range assets {
		keepOut := a.Duration
		if keepOut <= 0 {
			keepOut = perAsset
		}
		if keepOut > perAsset {
			keepOut = perAsset
		}
		if keepOut < 1 {
			keepOut = 1
		}
		plan.Segments = append(plan.Segments, PlanSegment{
			AssetID: fmt.Sprintf("%d", a.ID),
			Reason:  "heuristic: upload order",
			KeepIn:  0,
			KeepOut: keepOut,
		})
	}
	return plan
}

// heuristicDSL mock 模式的确定性 DSL：video 轨顺序排布 + 片长标题字幕。
func heuristicDSL(intent *Intent, assets []model.Asset) (json.RawMessage, error) {
	dsl := DSLTimeline{
		Version: "1.0",
		FPS:     30,
		Canvas:  DSLCanvas{Width: 1080, Height: 1920},
		Tracks:  []DSLTrack{{ID: "v1", Type: "video", Name: "主轨", Clips: []DSLClip{}}},
	}
	start := 0.0
	for _, a := range assets {
		dur := a.Duration
		if dur <= 0 || dur > 8 {
			dur = 8
		}
		if dur < 1 {
			dur = 1
		}
		dsl.Tracks[0].Clips = append(dsl.Tracks[0].Clips, DSLClip{
			ID:      fmt.Sprintf("clip-%d", a.ID),
			AssetID: fmt.Sprintf("%d", a.ID),
			Type:    "video",
			Start:   start,
			End:     start + dur,
		})
		start += dur
	}
	dsl.Duration = start
	// 目标时长仅作参考：保持片段连续合法，宁可略超目标也不产生越界 clip
	return dsl.Marshal()
}
