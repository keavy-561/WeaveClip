package ai

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/weaveclip/server/internal/model"
)

func TestUnmarshalLooseJSON(t *testing.T) {
	var out struct {
		A int `json:"a"`
	}
	require.NoError(t, UnmarshalLooseJSON(`{"a":1}`, &out))
	assert.Equal(t, 1, out.A)

	require.NoError(t, UnmarshalLooseJSON("```json\n{\"a\":2}\n```", &out))
	assert.Equal(t, 2, out.A)

	require.NoError(t, UnmarshalLooseJSON("好的，结果如下：{\"a\":3} 以上。", &out))
	assert.Equal(t, 3, out.A)

	assert.Error(t, UnmarshalLooseJSON("no json here", &out))
}

const validDSL = `{
  "version":"1.0","fps":30,"duration":10,
  "canvas":{"width":1080,"height":1920},
  "tracks":[{"id":"v1","type":"video","clips":[
    {"id":"c1","assetId":"1","type":"video","start":0,"end":5},
    {"id":"c2","assetId":"2","type":"video","start":5,"end":10}
  ]}]
}`

func TestDSLValidate(t *testing.T) {
	var good DSLTimeline
	require.NoError(t, json.Unmarshal([]byte(validDSL), &good))
	assert.NoError(t, good.Validate())

	// 时长越界
	var bad DSLTimeline
	require.NoError(t, json.Unmarshal([]byte(validDSL), &bad))
	bad.Tracks[0].Clips[1].End = 12
	assert.Error(t, bad.Validate())

	// video clip 缺 assetId
	require.NoError(t, json.Unmarshal([]byte(validDSL), &bad))
	bad.Tracks[0].Clips[0].AssetID = ""
	assert.Error(t, bad.Validate())

	// 非法轨道类型
	require.NoError(t, json.Unmarshal([]byte(validDSL), &bad))
	bad.Tracks[0].Type = "magic"
	assert.Error(t, bad.Validate())

	// 重复 clip id
	require.NoError(t, json.Unmarshal([]byte(validDSL), &bad))
	bad.Tracks[0].Clips[1].ID = "c1"
	assert.Error(t, bad.Validate())
}

func TestIntentParser_WithMock(t *testing.T) {
	llm := NewMockLLM()
	llm.Func = func(system string, messages []Message) (string, error) {
		if strings.Contains(system, "意图解析器") {
			return `{"targetDuration":45,"style":"energetic","keywords":["vlog"],"needMirroring":false}`, nil
		}
		return "", assert.AnError
	}
	intent, err := NewIntentParser(llm).Parse(context.Background(), "帮我剪一个45秒的旅行vlog")
	require.NoError(t, err)
	assert.Equal(t, 45.0, intent.TargetDuration)
	assert.Equal(t, "energetic", intent.Style)
	assert.Equal(t, []string{"vlog"}, intent.Keywords)
}

func TestPipeline_WithStubLLM(t *testing.T) {
	llm := NewMockLLM()
	llm.Func = func(system string, messages []Message) (string, error) {
		switch {
		case strings.Contains(system, "意图解析器"):
			return `{"targetDuration":20,"style":"cinematic","useAllAssets":true,"needMirroring":false}`, nil
		case strings.Contains(system, "规划器"):
			return `{"segments":[{"assetId":"1","reason":"first","keepIn":0,"keepOut":10},{"assetId":"2","reason":"second","keepIn":0,"keepOut":10}]}`, nil
		case strings.Contains(system, "时间线编辑器"):
			return validDSL, nil
		}
		return "", assert.AnError
	}
	p := NewPipeline(llm)
	assets := []model.Asset{
		{ID: 1, Type: "video", FileName: "a.mp4", Duration: 12},
		{ID: 2, Type: "video", FileName: "b.mp4", Duration: 15},
	}
	result, err := p.Run(context.Background(), "剪一个20秒的片子", assets)
	require.NoError(t, err)
	assert.NotNil(t, result.DSL)
	assert.NoError(t, result.DSL.Validate())
}

func TestPipeline_Heuristic(t *testing.T) {
	p := NewPipeline(NewMockLLM())
	p.EnableHeuristic = true
	assets := []model.Asset{
		{ID: 1, Type: "video", FileName: "a.mp4", Duration: 12},
		{ID: 2, Type: "video", FileName: "b.mp4", Duration: 15},
	}
	result, err := p.Run(context.Background(), "随便剪一下", assets)
	require.NoError(t, err)
	require.NoError(t, result.DSL.Validate())
	// 两段素材顺序排布，各自时长被钳制到 [1,8]
	assert.Equal(t, 16.0, result.DSL.Duration)
	assert.Len(t, result.DSL.Tracks[0].Clips, 2)
}

func TestPipeline_NoAssets(t *testing.T) {
	p := NewPipeline(NewMockLLM())
	_, err := p.Run(context.Background(), "剪一下", nil)
	assert.Error(t, err)
}
