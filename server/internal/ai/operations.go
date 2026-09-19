package ai

import (
	"encoding/json"
	"fmt"
)

// Operation 对话编辑操作类型（对齐 development-plan §10.2 与前端 types/ai.ts）。
// 支持 6 种：replace | trim | delete | reorder | add_caption | change_music。
type Operation struct {
	Type         string  `json:"type"`
	ClipID       string  `json:"clipId,omitempty"`
	AssetID      string  `json:"assetId,omitempty"`      // replace / change_music
	TrimIn       *float64 `json:"trimIn,omitempty"`      // trim
	TrimOut      *float64 `json:"trimOut,omitempty"`     // trim
	NewIndex     *int    `json:"newIndex,omitempty"`     // reorder（目标下标）
	TargetClipID string  `json:"targetClipId,omitempty"` // reorder（放到目标 clip 之前）
	Caption      string  `json:"caption,omitempty"`      // add_caption
	Reply        string  `json:"-"`                      // 附带说明不入库到 operation
}

// ChatAgentOutput LLM 对话编辑的结构化输出。
type ChatAgentOutput struct {
	Message    string      `json:"message"`
	Operations []Operation `json:"operations"`
}

const ChatSystem = `你是视频时间线对话编辑器。根据当前时间线、素材列表和用户指令，输出 JSON：
{message: "给用户的简短说明", operations: [...]}。
operations 支持 6 种：
{"type":"replace","clipId":"c1","assetId":"3"} 替换片段素材；
{"type":"trim","clipId":"c1","trimIn":1,"trimOut":4} 修剪素材区间（end 会随 end-start=trimOut-trimIn 调整）；
{"type":"delete","clipId":"c1"} 删除片段；
{"type":"reorder","clipId":"c1","newIndex":0} 在轨道内移动到指定下标；
{"type":"add_caption","clipId":"c1","caption":"文本"} 给片段加字幕；
{"type":"change_music","assetId":"5"} 更换背景音乐（audio 轨）。
没有可执行修改时 operations 返回空数组。只输出 JSON。`

// ParseChatAgentOutput 解析 LLM 输出。
func ParseChatAgentOutput(text string) (*ChatAgentOutput, error) {
	var out ChatAgentOutput
	if err := UnmarshalLooseJSON(text, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

// ApplyOperations 把操作序列应用到 DSL，返回更新后的 DSL（新对象）。
// 应用后对受影响轨道做时间轴归一化（按片段时长顺序紧凑排列）。
func ApplyOperations(dsl *DSLTimeline, ops []Operation) (*DSLTimeline, error) {
	if dsl == nil {
		return nil, fmt.Errorf("nil timeline")
	}
	// 深拷贝，避免改动调用方数据
	raw, err := json.Marshal(dsl)
	if err != nil {
		return nil, err
	}
	next := new(DSLTimeline)
	if err := json.Unmarshal(raw, next); err != nil {
		return nil, err
	}

	for _, op := range ops {
		switch op.Type {
		case "replace":
			clip := findClip(next, op.ClipID)
			if clip == nil {
				return nil, fmt.Errorf("clip %s not found", op.ClipID)
			}
			clip.AssetID = op.AssetID
		case "trim":
			clip := findClip(next, op.ClipID)
			if clip == nil {
				return nil, fmt.Errorf("clip %s not found", op.ClipID)
			}
			if op.TrimIn != nil {
				clip.TrimIn = *op.TrimIn
			}
			if op.TrimOut != nil {
				clip.TrimOut = *op.TrimOut
			}
			if clip.TrimOut <= clip.TrimIn {
				return nil, fmt.Errorf("invalid trim range [%f,%f)", clip.TrimIn, clip.TrimOut)
			}
			clip.End = clip.Start + (clip.TrimOut - clip.TrimIn)
		case "delete":
			if !removeClip(next, op.ClipID) {
				return nil, fmt.Errorf("clip %s not found", op.ClipID)
			}
		case "reorder":
			if err := reorderClip(next, op.ClipID, op.TargetClipID, op.NewIndex); err != nil {
				return nil, err
			}
		case "add_caption":
			clip := findClip(next, op.ClipID)
			if clip == nil {
				return nil, fmt.Errorf("clip %s not found", op.ClipID)
			}
			textTrack := addCaptionTrack(next)
			textTrack.Clips = append(textTrack.Clips, DSLClip{
				ID:    fmt.Sprintf("caption-%s-%d", clip.ID, len(textTrack.Clips)),
				Type:  "text",
				Start: clip.Start,
				End:   clip.End,
				Text:  op.Caption,
			})
		case "change_music":
			if op.AssetID == "" {
				return nil, fmt.Errorf("change_music requires assetId")
			}
			audioTrack := firstTrackOfType(next, "audio")
			if audioTrack == nil {
				next.Tracks = append(next.Tracks, DSLTrack{ID: "a1", Type: "audio", Name: "音乐", Clips: []DSLClip{}})
				audioTrack = &next.Tracks[len(next.Tracks)-1]
			}
			if len(audioTrack.Clips) > 0 {
				audioTrack.Clips[0].AssetID = op.AssetID
			} else {
				audioTrack.Clips = append(audioTrack.Clips, DSLClip{
					ID: "music-1", AssetID: op.AssetID, Type: "audio", Start: 0, End: next.Duration,
				})
			}
		default:
			return nil, fmt.Errorf("unsupported operation type %q", op.Type)
		}
	}

	normalizeVideoTracks(next)
	return next, nil
}

func findClip(dsl *DSLTimeline, clipID string) *DSLClip {
	for ti := range dsl.Tracks {
		for ci := range dsl.Tracks[ti].Clips {
			if dsl.Tracks[ti].Clips[ci].ID == clipID {
				return &dsl.Tracks[ti].Clips[ci]
			}
		}
	}
	return nil
}

func removeClip(dsl *DSLTimeline, clipID string) bool {
	for ti := range dsl.Tracks {
		for ci := range dsl.Tracks[ti].Clips {
			if dsl.Tracks[ti].Clips[ci].ID == clipID {
				dsl.Tracks[ti].Clips = append(dsl.Tracks[ti].Clips[:ci], dsl.Tracks[ti].Clips[ci+1:]...)
				return true
			}
		}
	}
	return false
}

func reorderClip(dsl *DSLTimeline, clipID, targetClipID string, newIndex *int) error {
	for ti := range dsl.Tracks {
		clips := dsl.Tracks[ti].Clips
		idx := -1
		for ci := range clips {
			if clips[ci].ID == clipID {
				idx = ci
				break
			}
		}
		if idx < 0 {
			continue
		}
		clip := clips[idx]
		clips = append(clips[:idx], clips[idx+1:]...)
		pos := len(clips)
		switch {
		case targetClipID != "":
			for ci := range clips {
				if clips[ci].ID == targetClipID {
					pos = ci
					break
				}
			}
		case newIndex != nil:
			pos = *newIndex
			if pos < 0 {
				pos = 0
			}
			if pos > len(clips) {
				pos = len(clips)
			}
		}
		clips = append(clips[:pos], append([]DSLClip{clip}, clips[pos:]...)...)
		dsl.Tracks[ti].Clips = clips
		return nil
	}
	return fmt.Errorf("clip %s not found", clipID)
}

func firstTrackOfType(dsl *DSLTimeline, typ string) *DSLTrack {
	for ti := range dsl.Tracks {
		if dsl.Tracks[ti].Type == typ {
			return &dsl.Tracks[ti]
		}
	}
	return nil
}

func addCaptionTrack(dsl *DSLTimeline) *DSLTrack {
	if t := firstTrackOfType(dsl, "text"); t != nil {
		return t
	}
	dsl.Tracks = append(dsl.Tracks, DSLTrack{ID: "txt1", Type: "text", Name: "字幕", Clips: []DSLClip{}})
	return &dsl.Tracks[len(dsl.Tracks)-1]
}

// normalizeVideoTracks 视频轨按片段时长顺序紧凑排列并更新总时长。
func normalizeVideoTracks(dsl *DSLTimeline) {
	maxEnd := 0.0
	for ti := range dsl.Tracks {
		if dsl.Tracks[ti].Type != "video" {
			continue
		}
		start := 0.0
		for ci := range dsl.Tracks[ti].Clips {
			clip := &dsl.Tracks[ti].Clips[ci]
			dur := clip.End - clip.Start
			if dur <= 0 {
				dur = 1
			}
			clip.Start = start
			clip.End = start + dur
			start += dur
			if clip.End > maxEnd {
				maxEnd = clip.End
			}
		}
	}
	if maxEnd > 0 {
		dsl.Duration = maxEnd
	}
}
