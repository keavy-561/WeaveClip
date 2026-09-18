// Package media 封装 ffprobe/ffmpeg 本地工具链：元数据提取与缩略图生成（工单 B07）。
// 外部工具缺失时降级为 skipped，不阻塞上传主链路（CI runner 会安装 ffmpeg 真实链路）。
package media

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	"github.com/weaveclip/server/internal/storage"
)

// ProbeResult ffprobe 提取的素材元数据。
type ProbeResult struct {
	Duration float64 `json:"duration"`
	Width    int     `json:"width"`
	Height   int     `json:"height"`
	FPS      float64 `json:"fps"`
	Codec    string  `json:"codec"`
}

// Tools 工具路径集合。
type Tools struct {
	FFprobe string
	FFmpeg  string
}

// LookupTools 从 PATH 探测工具；返回 found=false 表示本机不可用（跳过处理）。
func LookupTools(ffprobePath, ffmpegPath string) (Tools, bool) {
	t := Tools{FFprobe: ffprobePath, FFmpeg: ffmpegPath}
	if t.FFprobe == "" {
		t.FFprobe = "ffprobe"
	}
	if t.FFmpeg == "" {
		t.FFmpeg = "ffmpeg"
	}
	if _, err := exec.LookPath(t.FFprobe); err != nil {
		return t, false
	}
	if _, err := exec.LookPath(t.FFmpeg); err != nil {
		return t, false
	}
	return t, true
}

// ffprobeOutput 只取我们关心的字段。
type ffprobeOutput struct {
	Format struct {
		Duration string `json:"duration"`
	} `json:"format"`
	Streams []struct {
		CodecType string `json:"codec_type"`
		CodecName string `json:"codec_name"`
		Width     int    `json:"width"`
		Height    int    `json:"height"`
		AvgFrameR string `json:"avg_frame_rate"`
	} `json:"streams"`
}

// Probe 提取音视频元数据。
func Probe(ctx context.Context, tools Tools, localFile string) (*ProbeResult, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	out, err := exec.CommandContext(ctx, tools.FFprobe,
		"-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", localFile,
	).Output()
	if err != nil {
		return nil, fmt.Errorf("ffprobe: %w", err)
	}
	var parsed ffprobeOutput
	if err := json.Unmarshal(out, &parsed); err != nil {
		return nil, fmt.Errorf("parse ffprobe output: %w", err)
	}
	res := &ProbeResult{}
	_, _ = fmt.Sscanf(parsed.Format.Duration, "%f", &res.Duration)
	for _, st := range parsed.Streams {
		if st.CodecType == "video" && res.Width == 0 {
			res.Width = st.Width
			res.Height = st.Height
			res.Codec = st.CodecName
			res.FPS = parseFrameRate(st.AvgFrameR)
		}
		if res.Codec == "" && st.CodecType == "audio" {
			res.Codec = st.CodecName
		}
	}
	return res, nil
}

// parseFrameRate 解析 "30000/1001" 形式的帧率。
func parseFrameRate(s string) float64 {
	var num, den float64
	if n, _ := fmt.Sscanf(s, "%f/%f", &num, &den); n == 2 && den > 0 {
		return num / den
	}
	_, _ = fmt.Sscanf(s, "%f", &num)
	return num
}

// Thumbnail 从视频生成首帧后 1 秒的 JPEG 缩略图，上传到存储，返回存储 key。
func Thumbnail(ctx context.Context, tools Tools, localFile string, store storage.Storage, thumbKey string) (string, error) {
	tmpDir, err := os.MkdirTemp("", "weaveclip-thumb-*")
	if err != nil {
		return "", fmt.Errorf("create temp dir: %w", err)
	}
	defer os.RemoveAll(tmpDir)
	out := filepath.Join(tmpDir, "thumb.jpg")

	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	// -ss 放在 -i 前做关键帧快照；1 秒处通常已出画面
	if err := exec.CommandContext(ctx, tools.FFmpeg,
		"-y", "-ss", "1", "-i", localFile, "-frames:v", "1", "-f", "image2", out,
	).Run(); err != nil {
		return "", fmt.Errorf("ffmpeg thumbnail: %w", err)
	}
	f, err := os.Open(out)
	if err != nil {
		return "", fmt.Errorf("open thumbnail: %w", err)
	}
	defer f.Close()
	info, err := f.Stat()
	if err != nil {
		return "", err
	}
	if err := store.Put(ctx, thumbKey, f, info.Size(), "image/jpeg"); err != nil {
		return "", fmt.Errorf("upload thumbnail: %w", err)
	}
	return thumbKey, nil
}
