// Package render Video DSL → FFmpeg 编译器（工单 B17）。
// 纯函数：输入 DSL 与素材本地路径，输出 ffmpeg 命令步骤与字幕内容，便于快照测试。
package render

import (
	"fmt"
	"sort"
	"strings"

	"github.com/weaveclip/server/internal/ai"
)

// Step 一条 ffmpeg 命令。
type Step struct {
	Desc string   `json:"desc"`
	Args []string `json:"args"`
}

// Plan 编译产物：按序执行的命令 + 副产物文件内容。
type Plan struct {
	Steps     []Step `json:"steps"`
	Output    string `json:"output"`    // 最终产物路径
	Subtitles string `json:"subtitles"` // SRT 内容（有时间轴字幕时非空）
	SubtitleFile string `json:"subtitleFile,omitempty"`
}

// Options 编译选项。
type Options struct {
	Width    int
	Height   int
	FPS      int
	WorkDir  string
	Output   string // 最终输出文件名（含扩展名）
	CRF      string // 质量（默认 20）
}

// Compile 把 DSL 编译为 ffmpeg 命令计划。
// assetFiles: assetId(字符串) → 本地文件路径；缺失的素材路径直接报错。
func Compile(dsl *ai.DSLTimeline, assetFiles map[string]string, opt Options) (*Plan, error) {
	if dsl == nil {
		return nil, fmt.Errorf("nil timeline")
	}
	if opt.Width <= 0 || opt.Height <= 0 {
		opt.Width, opt.Height = 1080, 1920
	}
	if opt.FPS <= 0 {
		opt.FPS = dsl.FPS
		if opt.FPS <= 0 {
			opt.FPS = 30
		}
	}
	if opt.CRF == "" {
		opt.CRF = "20"
	}
	if opt.Output == "" {
		opt.Output = "output.mp4"
	}

	videoTrack := firstVideoTrack(dsl)
	if videoTrack == nil || len(videoTrack.Clips) == 0 {
		return nil, fmt.Errorf("no video clips to render")
	}
	clips := videoTrack.Clips

	// 输入参数 + 每个片段的滤镜链
	inputArgs := []string{"-hide_banner", "-y"}
	chain := make([]string, 0, len(clips))
	durations := make([]float64, len(clips))
	for i, clip := range clips {
		key := clipAssetKey(&clips[i])
		src, ok := assetFiles[key]
		if !ok {
			return nil, fmt.Errorf("asset %s file not provided", key)
		}
		inputArgs = append(inputArgs, "-i", src)

		trimIn, dur := clipRange(&clips[i])
		if dur <= 0 {
			return nil, fmt.Errorf("clip %s non-positive duration", clip.ID)
		}
		durations[i] = dur
		filters := []string{
			fmt.Sprintf("trim=start=%.3f:end=%.3f", trimIn, trimIn+dur),
			"setpts=PTS-STARTPTS",
		}
		if clip.Speed > 0 && clip.Speed != 1 {
			filters = append(filters, fmt.Sprintf("setpts=%.6f*PTS", 1.0/clip.Speed))
			durations[i] = dur / clip.Speed
		}
		filters = append(filters,
			fmt.Sprintf("scale=%d:%d:force_original_aspect_ratio=increase,crop=%d:%d", opt.Width, opt.Height, opt.Width, opt.Height),
			fmt.Sprintf("fps=%d", opt.FPS))
		if clip.Brightness != nil || clip.Contrast != nil {
			eq := "eq"
			if clip.Brightness != nil {
				eq += fmt.Sprintf(":brightness=%.3f", *clip.Brightness)
			}
			if clip.Contrast != nil {
				eq += fmt.Sprintf(":contrast=%.3f", *clip.Contrast)
			}
			filters = append(filters, eq)
		}
		chain = append(chain, fmt.Sprintf("[%d:v]%s[v%d]", i, strings.Join(filters, ","), i))
	}

	// 视频主链：xfade 转场或 concat
	var videoOut string
	if hasTransitions(clips) {
		prev := "v0"
		offset := durations[0]
		overlap := 0.5
		for i := 1; i < len(clips); i++ {
			out := fmt.Sprintf("x%d", i)
			transition := clips[i-1].Transition
			if transition == "" {
				transition = "fade"
			}
			chain = append(chain, fmt.Sprintf("[%s][v%d]xfade=transition=%s:duration=%.3f:offset=%.3f[%s]",
				prev, i, transition, overlap, offset, out))
			prev = out
			offset += durations[i] - overlap
		}
		videoOut = prev
	} else {
		labels := make([]string, len(clips))
		for i := range clips {
			labels[i] = fmt.Sprintf("[v%d]", i)
		}
		videoOut = "vcat"
		chain = append(chain, fmt.Sprintf("%sconcat=n=%d:v=1:a=0[%s]",
			strings.Join(labels, ""), len(clips), videoOut))
	}
	totalDuration := 0.0
	for _, d := range durations {
		totalDuration += d
	}
	if hasTransitions(clips) && len(clips) > 1 {
		// xfade 有 (n-1) 个 0.5s 重叠
		totalDuration -= 0.5 * float64(len(clips)-1)
	}

	// 字幕
	subtitleFile := ""
	captions := collectCaptions(dsl)
	subFilter := ""
	if len(captions) > 0 {
		subtitleFile = opt.WorkDir + "/subtitles.srt"
		// 字幕时间轴相对正片；无转场时与原片段时间轴一致
		subFilter = fmt.Sprintf(",subtitles='%s'", escapeFilterPath(subtitleFile))
	}

	// 音频：取 audio 轨第一个 clip 作为背景音乐（音量 0.4，循环到正片结束）
	extraArgs := []string{}
	hasBGM := false
	videoMap := []string{"-map", fmt.Sprintf("[%s]", videoOut)}
	audioTrack := firstTrackOfType(dsl, "audio")
	if audioTrack != nil && len(audioTrack.Clips) > 0 {
		bgm := clipAssetKey(&audioTrack.Clips[0])
		if src, ok := assetFiles[bgm]; ok {
			hasBGM = true
			extraArgs = append(extraArgs, "-stream_loop", "-1", "-i", src)
			bgmIdx := len(clips)
			vol := 0.4
			if audioTrack.Clips[0].Volume != nil {
				vol = *audioTrack.Clips[0].Volume
			}
			chain = append(chain, fmt.Sprintf("[%d:a]atrim=0:%.3f,volume=%.2f[aout]", bgmIdx, totalDuration, vol))
		}
	}

	// 最终滤镜：视频输出接字幕
	finalVideo := videoOut
	if subFilter != "" {
		chain = append(chain, fmt.Sprintf("[%s]null%s[vsub]", videoOut, subFilter))
		finalVideo = "vsub"
		videoMap[1] = fmt.Sprintf("[%s]", finalVideo)
	}

	args := append(inputArgs, extraArgs...)
	args = append(args,
		"-filter_complex", strings.Join(chain, ";"))
	args = append(args, videoMap...)
	if hasBGM {
		args = append(args, "-map", "[aout]", "-shortest")
	}
	args = append(args,
		"-c:v", "libx264", "-crf", opt.CRF, "-preset", "veryfast",
		"-pix_fmt", "yuv420p", "-r", fmt.Sprintf("%d", opt.FPS),
		"-c:a", "aac", "-movflags", "+faststart",
		opt.Output)

	plan := &Plan{
		Steps:     []Step{{Desc: "render timeline", Args: args}},
		Output:    opt.Output,
		Subtitles: SRT(captions),
	}
	if subtitleFile != "" {
		plan.SubtitleFile = subtitleFile
	}
	return plan, nil
}

// Caption 字幕条目（按出现顺序）。
type Caption struct {
	Start float64
	End   float64
	Text  string
}

// SRT 渲染 SRT 内容。
func SRT(captions []Caption) string {
	if len(captions) == 0 {
		return ""
	}
	var sb strings.Builder
	for i, c := range captions {
		sb.WriteString(fmt.Sprintf("%d\n%s --> %s\n%s\n\n",
			i+1, srtTime(c.Start), srtTime(c.End), strings.ReplaceAll(c.Text, "\n", " ")))
	}
	return sb.String()
}

func srtTime(t float64) string {
	ms := int(t * 1000)
	return fmt.Sprintf("%02d:%02d:%02d,%03d", ms/3600000, (ms/60000)%60, (ms/1000)%60, ms%1000)
}

func collectCaptions(dsl *ai.DSLTimeline) []Caption {
	captions := make([]Caption, 0, 8)
	for ti := range dsl.Tracks {
		if dsl.Tracks[ti].Type != "text" {
			continue
		}
		for _, clip := range dsl.Tracks[ti].Clips {
			if clip.Text == "" {
				continue
			}
			captions = append(captions, Caption{Start: clip.Start, End: clip.End, Text: clip.Text})
		}
	}
	sort.Slice(captions, func(i, j int) bool { return captions[i].Start < captions[j].Start })
	return captions
}

func firstVideoTrack(dsl *ai.DSLTimeline) *ai.DSLTrack {
	return firstTrackOfType(dsl, "video")
}

func firstTrackOfType(dsl *ai.DSLTimeline, typ string) *ai.DSLTrack {
	for ti := range dsl.Tracks {
		if dsl.Tracks[ti].Type == typ {
			return &dsl.Tracks[ti]
		}
	}
	return nil
}

func hasTransitions(clips []ai.DSLClip) bool {
	for _, c := range clips {
		if c.Transition != "" {
			return true
		}
	}
	return false
}

func clipRange(clip *ai.DSLClip) (trimIn, dur float64) {
	trimIn = clip.TrimIn
	dur = clip.End - clip.Start
	if clip.TrimOut > trimIn {
		dur = clip.TrimOut - trimIn
	}
	if dur <= 0 {
		dur = 1
	}
	return trimIn, dur
}

// clipAssetKey 统一取出素材标识。
func clipAssetKey(clip *ai.DSLClip) string {
	switch v := clip.AssetID.(type) {
	case string:
		return v
	case float64:
		return fmt.Sprintf("%d", int64(v))
	default:
		return ""
	}
}

// escapeFilterPath 转义 subtitles 滤镜路径中的特殊字符。
func escapeFilterPath(p string) string {
	p = strings.ReplaceAll(p, "\\", "/")
	p = strings.ReplaceAll(p, ":", "\\:")
	p = strings.ReplaceAll(p, "'", "\\'")
	return p
}
