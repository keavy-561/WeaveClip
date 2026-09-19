package ai

import (
	"encoding/json"
	"fmt"
	"sort"

	"github.com/weaveclip/server/internal/model"
)

// DSLTimeline Video DSL 顶层结构（对齐 development-plan §10 与前端 types/timeline.ts）。
type DSLTimeline struct {
	Version  string     `json:"version"`
	FPS      int        `json:"fps"`
	Duration float64    `json:"duration"`
	Canvas   DSLCanvas  `json:"canvas"`
	Tracks   []DSLTrack `json:"tracks"`
}

// DSLCanvas 画布尺寸。
type DSLCanvas struct {
	Width  int `json:"width"`
	Height int `json:"height"`
}

// DSLTrack 轨道：video / text / audio。
type DSLTrack struct {
	ID    string    `json:"id"`
	Type  string    `json:"type"`
	Name  string    `json:"name,omitempty"`
	Clips []DSLClip `json:"clips"`
}

// DSLClip 片段。
type DSLClip struct {
	ID         string         `json:"id"`
	AssetID    any            `json:"assetId"` // 前端为 string，DSL 校验容忍 string/number
	Type       string         `json:"type"`
	Start      float64        `json:"start"`
	End        float64        `json:"end"`
	TrimIn     float64        `json:"trimIn,omitempty"`
	TrimOut    float64        `json:"trimOut,omitempty"`
	Speed      float64        `json:"speed,omitempty"`
	Volume     *float64       `json:"volume,omitempty"`
	Brightness *float64       `json:"brightness,omitempty"`
	Contrast   *float64       `json:"contrast,omitempty"`
	Transition string         `json:"transition,omitempty"` // 与下一片段间的转场：fade|wipeleft|slideup 等（xfade）
	Text       string         `json:"text,omitempty"`
	Extra      map[string]any `json:"-"`
}

// assetKey 统一 assetId 的取值形式。
func (c *DSLClip) assetKey() string {
	switch v := c.AssetID.(type) {
	case string:
		return v
	case float64:
		return fmt.Sprintf("%d", int64(v))
	default:
		return ""
	}
}

// Validate 全量校验：结构 + 同轨时间轴无重叠。
// AI 管线与渲染入口使用——LLM 产出或入队快照必须可直接渲染（工单 WO8-13）。
func (t *DSLTimeline) Validate() error {
	if err := t.ValidateStructure(); err != nil {
		return err
	}
	return t.validateNoOverlap()
}

// ValidateStructure 结构校验：时间合法、轨道类型合法、片段引用合法。
// 不含同轨重叠检查——前端编辑器允许拖拽/裁剪产生临时重叠，PUT 持久化入口用本方法；
// 渲染前由渲染入口做全量 Validate 拦截（工单 WO8-13）。
func (t *DSLTimeline) ValidateStructure() error {
	if t.FPS <= 0 {
		return fmt.Errorf("invalid fps %d", t.FPS)
	}
	if t.Duration <= 0 {
		return fmt.Errorf("invalid duration %f", t.Duration)
	}
	seenClip := map[string]bool{}
	for ti := range t.Tracks {
		track := &t.Tracks[ti]
		switch track.Type {
		case "video", "text", "audio":
		default:
			return fmt.Errorf("track %s has invalid type %q", track.ID, track.Type)
		}
		for ci := range track.Clips {
			clip := &track.Clips[ci]
			if seenClip[clip.ID] {
				return fmt.Errorf("duplicate clip id %s", clip.ID)
			}
			seenClip[clip.ID] = true
			if clip.Start < 0 || clip.End <= clip.Start {
				return fmt.Errorf("clip %s has invalid range [%f,%f)", clip.ID, clip.Start, clip.End)
			}
			if clip.End > t.Duration+0.001 {
				return fmt.Errorf("clip %s exceeds timeline duration", clip.ID)
			}
			if track.Type == "video" && clip.assetKey() == "" {
				return fmt.Errorf("video clip %s missing assetId", clip.ID)
			}
		}
	}
	return nil
}

// validateNoOverlap 同轨内片段时间轴无重叠：按 start 排序后检查相邻片段（容差 1ms）。
func (t *DSLTimeline) validateNoOverlap() error {
	for ti := range t.Tracks {
		clips := make([]*DSLClip, len(t.Tracks[ti].Clips))
		for ci := range t.Tracks[ti].Clips {
			clips[ci] = &t.Tracks[ti].Clips[ci]
		}
		sort.Slice(clips, func(i, j int) bool { return clips[i].Start < clips[j].Start })
		for i := 1; i < len(clips); i++ {
			if clips[i].Start < clips[i-1].End-0.001 {
				return fmt.Errorf(
					"track %s: clip %s overlaps clip %s",
					t.Tracks[ti].ID, clips[i-1].ID, clips[i].ID,
				)
			}
		}
	}
	return nil
}

// AssetSummary 传给 LLM 的素材摘要（避免塞完整元数据）。
type AssetSummary struct {
	ID       string  `json:"id"`
	Type     string  `json:"type"`
	FileName string  `json:"fileName"`
	Duration float64 `json:"duration"`
}

// SummarizeAssets 把素材列表转成摘要。
func SummarizeAssets(assets []model.Asset) []AssetSummary {
	out := make([]AssetSummary, 0, len(assets))
	for _, a := range assets {
		out = append(out, AssetSummary{
			ID:       fmt.Sprintf("%d", a.ID),
			Type:     a.Type,
			FileName: a.FileName,
			Duration: a.Duration,
		})
	}
	return out
}

// Marshal 返回压缩后的 DSL JSON。
func (t *DSLTimeline) Marshal() (json.RawMessage, error) {
	b, err := json.Marshal(t)
	if err != nil {
		return nil, err
	}
	return json.RawMessage(b), nil
}
