package render

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/weaveclip/server/internal/ai"
)

const renderDSL = `{
  "version":"1.0","fps":30,"duration":10,
  "canvas":{"width":1080,"height":1920},
  "tracks":[
    {"id":"v1","type":"video","clips":[
      {"id":"c1","assetId":"1","type":"video","start":0,"end":5,"brightness":0.1},
      {"id":"c2","assetId":"2","type":"video","start":5,"end":10,"transition":"fade"}
    ]},
    {"id":"txt1","type":"text","clips":[
      {"id":"cap1","type":"text","start":0,"end":3,"text":"Hello 织影"}
    ]},
    {"id":"a1","type":"audio","clips":[
      {"id":"m1","assetId":"9","type":"audio","start":0,"end":10}
    ]}
  ]
}`

func loadDSL(t *testing.T, raw string) *ai.DSLTimeline {
	t.Helper()
	var dsl ai.DSLTimeline
	require.NoError(t, json.Unmarshal([]byte(raw), &dsl))
	require.NoError(t, dsl.Validate())
	return &dsl
}

func TestCompile_Concat(t *testing.T) {
	// 去掉转场字段测 concat 路径
	dsl := loadDSL(t, strings.Replace(renderDSL, `,"transition":"fade"`, "", 1))
	plan, err := Compile(dsl, map[string]string{
		"1": "/tmp/a.mp4", "2": "/tmp/b.mp4", "9": "/tmp/music.mp3",
	}, Options{WorkDir: "/work", Output: "out.mp4"})
	require.NoError(t, err)
	require.Len(t, plan.Steps, 1)

	args := plan.Steps[0].Args
	joined := strings.Join(args, " ")
	// 三个输入：两个视频 + 一个循环背景音乐
	assert.Equal(t, 6, countFlag(args, "-i"))
	assert.Contains(t, joined, "concat=n=2:v=1:a=0")
	assert.Contains(t, joined, "eq:brightness") // c1 带 brightness 参数
	assert.Contains(t, joined, "subtitles=")
	assert.Contains(t, joined, "-c:v")
	assert.Contains(t, joined, "libx264")
	assert.Equal(t, "out.mp4", plan.Output)
	assert.Contains(t, plan.Subtitles, "Hello 织影")
	assert.NotEmpty(t, plan.SubtitleFile)
}

func TestCompile_Xfade(t *testing.T) {
	dsl := loadDSL(t, renderDSL)
	plan, err := Compile(dsl, map[string]string{"1": "/tmp/a.mp4", "2": "/tmp/b.mp4"},
		Options{WorkDir: "/work", Output: "out.mp4"})
	require.NoError(t, err)
	joined := strings.Join(plan.Steps[0].Args, " ")
	assert.Contains(t, joined, "xfade=transition=fade")
	assert.NotContains(t, joined, "concat=")
}

func TestCompile_MissingAsset(t *testing.T) {
	dsl := loadDSL(t, renderDSL)
	_, err := Compile(dsl, map[string]string{"1": "/tmp/a.mp4"}, Options{})
	assert.Error(t, err)
}

func TestSRT_TimeFormat(t *testing.T) {
	srt := SRT([]Caption{{Start: 0, End: 3.5, Text: "hi"}})
	assert.Contains(t, srt, "00:00:00,000 --> 00:00:03,500")
	assert.Contains(t, srt, "hi")
}

func countFlag(args []string, flag string) int {
	n := 0
	for _, a := range args {
		if a == flag {
			n++
		}
	}
	return n
}
