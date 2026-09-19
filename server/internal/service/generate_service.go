package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/weaveclip/server/internal/ai"
	"github.com/weaveclip/server/internal/model"
	"github.com/weaveclip/server/internal/repository"
)

// 生成链路错误。
var (
	ErrGenerationNotFound = errors.New("generation not found")
	ErrNoAssets           = errors.New("no video assets in project")
)

// Answer 澄清追问的回填。
type Answer struct {
	Question string `json:"question"`
	Answer   string `json:"answer"`
}

// GenerateService 一句话生成时间线（工单 B12）。
type GenerateService struct {
	generations repository.GenerationRepository
	projects    ProjectFinder
	assets      repository.AssetRepository
	timelines   *TimelineService
	pipeline    *ai.Pipeline
}

// NewGenerateService 创建生成服务。
func NewGenerateService(generations repository.GenerationRepository, projects ProjectFinder,
	assets repository.AssetRepository, timelines *TimelineService, pipeline *ai.Pipeline) *GenerateService {
	return &GenerateService{generations: generations, projects: projects, assets: assets, timelines: timelines, pipeline: pipeline}
}

// StartGeneration 创建生成任务并异步执行管线；需求模糊时返回 need_input。
func (s *GenerateService) StartGeneration(projectID, userID uint, prompt string, answers []Answer) (*model.Generation, error) {
	if _, err := s.projects.GetProject(projectID, userID); err != nil {
		return nil, ErrProjectNotFound
	}
	allAssets, err := s.assets.ListByProject(projectID)
	if err != nil {
		return nil, err
	}
	videoAssets := make([]model.Asset, 0, len(allAssets))
	for _, a := range allAssets {
		if a.Type == "video" {
			videoAssets = append(videoAssets, a)
		}
	}
	if len(videoAssets) == 0 {
		return nil, ErrNoAssets
	}
	if len(answers) > 0 {
		// 把澄清答案追加进 prompt，形成完整需求描述
		var sb strings.Builder
		sb.WriteString(prompt)
		for _, a := range answers {
			sb.WriteString("\n追问：")
			sb.WriteString(a.Question)
			sb.WriteString(" 回答：")
			sb.WriteString(a.Answer)
		}
		prompt = sb.String()
	}

	gen := &model.Generation{ProjectID: projectID, Prompt: prompt, Status: "processing"}
	if err := s.generations.Create(gen); err != nil {
		return nil, err
	}
	go s.run(*gen, videoAssets)
	return gen, nil
}

func (s *GenerateService) run(gen model.Generation, assets []model.Asset) {
	defer func() {
		if r := recover(); r != nil {
			slog.Error("generate pipeline panic", "generationId", gen.ID, "panic", r)
			s.fail(&gen, fmt.Sprintf("internal panic: %v", r))
		}
	}()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	result, err := s.pipeline.Run(ctx, gen.Prompt, assets)
	if err != nil {
		if errors.Is(err, ai.ErrLLMNotConfigured) {
			s.fail(&gen, "llm not configured")
			return
		}
		s.fail(&gen, err.Error())
		return
	}
	if result.Intent.NeedMirroring && len(result.Intent.ClarifyingQs) > 0 {
		// 需求模糊：AI 主动追问（Phase 2 验收项）
		gen.Status = "need_input"
		gen.Result = mustJSON(map[string]any{"questions": result.Intent.ClarifyingQs})
		s.save(&gen)
		return
	}
	// DSL 落库为新的时间线版本
	timeline, err := s.timelines.SaveInternal(gen.ProjectID, []byte(result.DSLRaw), "AI generate")
	if err != nil {
		// 落库失败退回仅写 generations，生成状态仍算完成但无 timelineVersion
		slog.Warn("save generated timeline failed", "generationId", gen.ID, "error", err)
	}
	gen.Status = "completed"
	resultPayload := map[string]any{"dsl": json.RawMessage(result.DSLRaw)}
	if timeline != nil {
		resultPayload["timelineVersion"] = timeline.Version
		resultPayload["timelineId"] = timeline.ID
	}
	gen.Result = mustJSON(resultPayload)
	s.save(&gen)
}

func (s *GenerateService) fail(gen *model.Generation, msg string) {
	gen.Status = "failed"
	gen.Error = msg
	s.save(gen)
}

func (s *GenerateService) save(gen *model.Generation) {
	if err := s.generations.Update(gen); err != nil {
		slog.Error("update generation failed", "generationId", gen.ID, "error", err)
	}
}

// GetGeneration 查询生成状态（属主校验）。
func (s *GenerateService) GetGeneration(id, userID uint) (*model.Generation, error) {
	gen, err := s.generations.Get(id)
	if err != nil {
		return nil, ErrGenerationNotFound
	}
	if _, err := s.projects.GetProject(gen.ProjectID, userID); err != nil {
		return nil, ErrGenerationNotFound
	}
	return gen, nil
}

func mustJSON(v any) []byte {
	b, err := json.Marshal(v)
	if err != nil {
		return []byte(`{}`)
	}
	return b
}
