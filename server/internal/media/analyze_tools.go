package media

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// SceneMark 场景切分标记（秒）。
type SceneMark struct {
	Time float64 `json:"time"`
}

var ptsTimeRe = regexp.MustCompile(`pts_time:([0-9.]+)`)

// DetectScenes 用 ffmpeg 场景阈值滤镜检测镜头切换点。
func DetectScenes(ctx context.Context, tools Tools, localFile string) ([]SceneMark, error) {
	ctx, cancel := context.WithTimeout(ctx, 90*time.Second)
	defer cancel()
	// showinfo 把每个被选中的场景切换帧打到 stderr，-f null 不产出视频
	cmd := exec.CommandContext(ctx, tools.FFmpeg,
		"-hide_banner", "-i", localFile,
		"-vf", `select='gt(scene,0.3)',showinfo`,
		"-an", "-f", "null", "-")
	out, cmdErr := cmd.CombinedOutput()
	marks := make([]SceneMark, 0, 16)
	for _, m := range ptsTimeRe.FindAllStringSubmatch(string(out), -1) {
		t, parseErr := strconv.ParseFloat(m[1], 64)
		if parseErr == nil {
			marks = append(marks, SceneMark{Time: t})
		}
	}
	// ffmpeg 偶发非零退出但已有可用输出；无输出且报错才算失败
	if cmdErr != nil && len(marks) == 0 {
		return nil, fmt.Errorf("scene detect: %w: %.200s", cmdErr, string(out))
	}
	return marks, nil
}

// whisperOutput whisper --output_format json 的结构（节选）。
type whisperOutput struct {
	Text     string `json:"text"`
	Segments []struct {
		Start float64 `json:"start"`
		End   float64 `json:"end"`
		Text  string  `json:"text"`
	} `json:"segments"`
}

// Transcribe 调 whisper CLI 生成带时间戳的转录结果。
func Transcribe(ctx context.Context, whisperPath, localFile string) (map[string]any, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Minute)
	defer cancel()
	tmpDir, err := os.MkdirTemp("", "weaveclip-asr-*")
	if err != nil {
		return nil, fmt.Errorf("create asr temp dir: %w", err)
	}
	defer os.RemoveAll(tmpDir)

	cmd := exec.CommandContext(ctx, whisperPath,
		"--model", "tiny", "--output_format", "json", "--output_dir", tmpDir, localFile)
	if out, err := cmd.CombinedOutput(); err != nil {
		return nil, fmt.Errorf("whisper: %w: %.200s", err, string(out))
	}
	base := filepath.Base(localFile)
	jsonPath := filepath.Join(tmpDir, strings.TrimSuffix(base, filepath.Ext(base))+".json")
	data, err := os.ReadFile(jsonPath)
	if err != nil {
		return nil, fmt.Errorf("read whisper output: %w", err)
	}
	var parsed whisperOutput
	if err := json.Unmarshal(data, &parsed); err != nil {
		return nil, fmt.Errorf("parse whisper output: %w", err)
	}
	result := map[string]any{"text": parsed.Text}
	segments := make([]map[string]any, 0, len(parsed.Segments))
	for _, s := range parsed.Segments {
		segments = append(segments, map[string]any{"start": s.Start, "end": s.End, "text": s.Text})
	}
	result["segments"] = segments
	return result, nil
}
