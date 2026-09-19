package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strings"

	"github.com/weaveclip/server/internal/model"
)

// Intent IntentParser 的结构化输出。
type Intent struct {
	TargetDuration  float64  `json:"targetDuration"`
	Style           string   `json:"style"`
	Mood            string   `json:"mood"`
	Keywords        []string `json:"keywords"`
	UseAllAssets    bool     `json:"useAllAssets"`
	NeedMirroring   bool     `json:"needMirroring"`   // 是否需要追问澄清
	ClarifyingQs    []string `json:"clarifyingQuestions"`
	RawPrompt       string   `json:"rawPrompt"`
}

// IntentParser 把自然语言解析为结构化意图（组件 1/5）。
type IntentParser struct {
	llm LLMClient
}

// NewIntentParser 创建 IntentParser。
func NewIntentParser(llm LLMClient) *IntentParser {
	return &IntentParser{llm: llm}
}

const intentSystem = `你是视频剪辑助手的意图解析器。把用户的剪辑需求解析为 JSON，字段：
targetDuration(秒,number)、style(字符串)、mood(字符串)、keywords(数组)、useAllAssets(布尔)。
只有当需求严重缺失（例如完全没提时长也没有素材线索）时才把 needMirroring 置 true 并在
clarifyingQuestions 里给出最多 2 个问题；否则 needMirroring=false。只输出 JSON。`

// Parse 解析用户 prompt。
func (p *IntentParser) Parse(ctx context.Context, prompt string) (*Intent, error) {
	var intent Intent
	if err := CompleteJSON(ctx, p.llm, intentSystem, prompt, &intent); err != nil {
		return nil, fmt.Errorf("intent parse: %w", err)
	}
	intent.RawPrompt = prompt
	// LLM 输出兜底：无时长时给默认 30s
	if intent.TargetDuration <= 0 {
		intent.TargetDuration = 30
	}
	if intent.Style == "" {
		intent.Style = "cinematic"
	}
	return &intent, nil
}

// PlanSegment 计划中的一个片段选择。
type PlanSegment struct {
	AssetID string  `json:"assetId"`
	Reason  string  `json:"reason"`
	KeepIn  float64 `json:"keepIn"`  // 素材内保留起点（秒）
	KeepOut float64 `json:"keepOut"` // 素材内保留终点（秒）
}

// Plan PlanningAgent 的剪辑计划。
type Plan struct {
	Segments   []PlanSegment `json:"segments"`
	BGMAssetID string        `json:"bgmAssetId,omitempty"`
	Notes      string        `json:"notes,omitempty"`
}

// PlanningAgent 依据意图制定剪辑计划（组件 2/5）。
type PlanningAgent struct {
	llm LLMClient
}

// NewPlanningAgent 创建 PlanningAgent。
func NewPlanningAgent(llm LLMClient) *PlanningAgent {
	return &PlanningAgent{llm: llm}
}

const planSystem = `你是视频剪辑规划器。根据意图和素材列表，挑选并排序素材片段，输出 JSON：
segments:[{assetId(字符串), reason, keepIn(秒), keepOut(秒)}]，
使总时长（keepOut-keepIn 之和）接近意图的 targetDuration。只输出 JSON。`

// Plan 生成剪辑计划。
func (p *PlanningAgent) Plan(ctx context.Context, intent *Intent, assets []model.Asset) (*Plan, error) {
	input, err := marshalCompact(map[string]any{"intent": intent, "assets": SummarizeAssets(assets)})
	if err != nil {
		return nil, err
	}
	var plan Plan
	if err := CompleteJSON(ctx, p.llm, planSystem, string(input), &plan); err != nil {
		return nil, fmt.Errorf("planning: %w", err)
	}
	if len(plan.Segments) == 0 {
		return nil, fmt.Errorf("planning produced no segments")
	}
	return &plan, nil
}

// AssetRetriever 候选素材检索（组件 3/5）：确定性打分，不依赖 LLM。
type AssetRetriever struct{}

// NewAssetRetriever 创建检索器。
func NewAssetRetriever() *AssetRetriever { return &AssetRetriever{} }

// Retrieve 按 intent 关键词与素材类型排序筛选候选，供 PlanningAgent 消费。
func (r *AssetRetriever) Retrieve(intent *Intent, assets []model.Asset) []model.Asset {
	type scored struct {
		asset model.Asset
		score int
	}
	list := make([]scored, 0, len(assets))
	for i, a := range assets {
		score := i // 上传顺序兜底
		if intent.UseAllAssets {
			score += 100
		}
		if a.Type == "video" {
			score += 50
		}
		lower := strings.ToLower(a.FileName)
		for _, kw := range intent.Keywords {
			if kw != "" && strings.Contains(lower, strings.ToLower(kw)) {
				score += 30
			}
		}
		list = append(list, scored{asset: a, score: score})
	}
	sort.SliceStable(list, func(i, j int) bool { return list[i].score > list[j].score })
	out := make([]model.Asset, 0, len(list))
	for _, s := range list {
		out = append(out, s.asset)
	}
	return out
}

// EditingAgent 依据计划产出 Video DSL（组件 4/5）。
type EditingAgent struct {
	llm LLMClient
}

// NewEditingAgent 创建 EditingAgent。
func NewEditingAgent(llm LLMClient) *EditingAgent {
	return &EditingAgent{llm: llm}
}

const editingSystem = `你是时间线编辑器。根据剪辑计划把素材片段排布到时间轴，输出 Video DSL JSON：
{version:"1.0", fps:30, duration(number), canvas:{width,height},
 tracks:[{id, type:"video"|"audio"|"text", name, clips:[{id, assetId(与计划一致), type, start, end, trimIn, trimOut}]}]}。
约束：video 轨 clip 的 start/end 连续无重叠；end-start == trimOut-trimIn；总时长=duration。只输出 JSON。`

// GenerateDSL 生成 DSL。
func (e *EditingAgent) GenerateDSL(ctx context.Context, intent *Intent, plan *Plan, assets []model.Asset) (json.RawMessage, error) {
	input, err := marshalCompact(map[string]any{"intent": intent, "plan": plan, "assets": SummarizeAssets(assets)})
	if err != nil {
		return nil, err
	}
	var raw json.RawMessage
	if err := CompleteJSON(ctx, e.llm, editingSystem, string(input), &raw); err != nil {
		return nil, fmt.Errorf("editing: %w", err)
	}
	// 立即解析+校验，尽早失败（组件 5/5 Validator 在 Pipeline 中再次把关）
	var dsl DSLTimeline
	if err := json.Unmarshal(raw, &dsl); err != nil {
		return nil, fmt.Errorf("editing produced invalid dsl: %w", err)
	}
	return raw, nil
}

func marshalCompact(v any) ([]byte, error) {
	b, err := json.Marshal(v)
	if err != nil {
		return nil, fmt.Errorf("marshal llm input: %w", err)
	}
	return b, nil
}
