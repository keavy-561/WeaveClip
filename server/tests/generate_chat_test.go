package tests

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/weaveclip/server/internal/ai"
	"github.com/weaveclip/server/internal/model"
	"github.com/weaveclip/server/internal/repository"
	"github.com/weaveclip/server/internal/service"
)

func newAITestStack(t *testing.T, llm ai.LLMClient) (*service.GenerateService, *service.ChatService, *service.TimelineService, repository.AssetRepository) {
	t.Helper()
	repository.ResetMockProjectStore()
	repository.AddMockProject(model.Project{ID: 1, UserID: 1, Name: "AI Test"})
	projectSvc := service.NewProjectService(repository.NewMockProjectRepo())
	assetRepo := repository.NewMockAssetRepo(nil)
	timelineSvc := service.NewTimelineService(repository.NewMockTimelineRepo(), projectSvc)
	generationRepo := repository.NewMockGenerationRepo()
	editRepo := repository.NewMockEditRepo()

	pipeline := ai.NewPipeline(llm)
	if _, ok := llm.(*ai.MockLLM); ok {
		pipeline.EnableHeuristic = true
	}
	genSvc := service.NewGenerateService(generationRepo, projectSvc, assetRepo, timelineSvc, pipeline)
	chatSvc := service.NewChatService(projectSvc, assetRepo, timelineSvc, editRepo, llm)
	return genSvc, chatSvc, timelineSvc, assetRepo
}

func TestGenerateService_MockHeuristicFlow(t *testing.T) {
	genSvc, _, _, assetRepo := newAITestStack(t, ai.NewMockLLM())

	// 无素材 → 422 语义错误
	_, err := genSvc.StartGeneration(1, 1, "剪一个视频", nil)
	assert.ErrorIs(t, err, service.ErrNoAssets)

	// 注入两个素材
	require.NoError(t, assetRepo.Create(&model.Asset{ID: 1, ProjectID: 1, Type: "video", FileName: "a.mp4", Duration: 6, Status: "ready"}))
	require.NoError(t, assetRepo.Create(&model.Asset{ID: 2, ProjectID: 1, Type: "video", FileName: "b.mp4", Duration: 6, Status: "ready"}))

	gen, err := genSvc.StartGeneration(1, 1, "剪一个10秒的视频", nil)
	require.NoError(t, err)
	assert.Equal(t, "processing", gen.Status)

	// 轮询直到完成（异步管线）
	deadline := time.Now().Add(5 * time.Second)
	var done *model.Generation
	for time.Now().Before(deadline) {
		g, err := genSvc.GetGeneration(gen.ID, 1)
		require.NoError(t, err)
		if g.Status == "completed" || g.Status == "failed" || g.Status == "need_input" {
			done = g
			break
		}
		time.Sleep(20 * time.Millisecond)
	}
	require.NotNil(t, done, "generation did not finish in time")
	assert.Equal(t, "completed", done.Status, "error: %s", done.Error)

	var result map[string]any
	require.NoError(t, json.Unmarshal(done.Result, &result))
	assert.Contains(t, result, "dsl")
	assert.Contains(t, result, "timelineVersion")
}

func TestChatService_MockHeuristicDelete(t *testing.T) {
	_, chatSvc, timelineSvc, assetRepo := newAITestStack(t, ai.NewMockLLM())
	require.NoError(t, assetRepo.Create(&model.Asset{ID: 1, ProjectID: 1, Type: "video", FileName: "a.mp4", Duration: 6, Status: "ready"}))

	// 先造一个时间线版本
	_, err := timelineSvc.SaveInternal(1, []byte(`{"version":"1.0","fps":30,"duration":6,"canvas":{"width":1080,"height":1920},"tracks":[{"id":"v1","type":"video","clips":[{"id":"c1","assetId":"1","type":"video","start":0,"end":6}]}]}`), "seed")
	require.NoError(t, err)

	result, err := chatSvc.Chat(1, 1, "把那个片段删掉", "c1")
	require.NoError(t, err)
	assert.NotEmpty(t, result.Operations)
	require.NotNil(t, result.Timeline)
	assert.Equal(t, 2, result.Timeline.Version)
}

func TestChatService_NoTimeline(t *testing.T) {
	_, chatSvc, _, _ := newAITestStack(t, ai.NewMockLLM())
	_, err := chatSvc.Chat(1, 1, "随便改改", "")
	assert.ErrorIs(t, err, service.ErrTimelineNotFound)
}
