// Package ai AI 能力层：LLM 客户端抽象、Video DSL 类型与 Agent Pipeline（工单 B10/B11）。
package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// Message 单条对话消息。
type Message struct {
	Role    string `json:"role"` // user | assistant
	Content string `json:"content"`
}

// LLMClient 大模型客户端抽象。
type LLMClient interface {
	// Complete 以 system 提示词 + 多轮消息请求补全，返回文本。
	Complete(ctx context.Context, system string, messages []Message) (string, error)
}

// ErrLLMNotConfigured 未配置 API key 时的降级信号。
var ErrLLMNotConfigured = errors.New("llm not configured")

// VisionImage 多模态输入图片（base64）。
type VisionImage struct {
	Base64    string
	MediaType string // image/jpeg
}

// VisionClient 可选的多模态能力：素材 Vision 分析用（类型断言按需取用）。
type VisionClient interface {
	CompleteVision(ctx context.Context, system, userText string, images []VisionImage) (string, error)
}

// CompleteJSON 请求补全并解析 JSON 响应（容忍代码围栏包裹）。
func CompleteJSON(ctx context.Context, client LLMClient, system, user string, out any) error {
	text, err := client.Complete(ctx, system, []Message{{Role: "user", Content: user}})
	if err != nil {
		return err
	}
	return UnmarshalLooseJSON(text, out)
}

// UnmarshalLooseJSON 解析可能被 ```json 围栏包裹的响应文本。
func UnmarshalLooseJSON(text string, out any) error {
	trimmed := strings.TrimSpace(text)
	trimmed = strings.TrimPrefix(trimmed, "```json")
	trimmed = strings.TrimPrefix(trimmed, "```")
	trimmed = strings.TrimSuffix(trimmed, "```")
	trimmed = strings.TrimSpace(trimmed)
	// 截取第一个 { 到最后一个 }（容忍模型前后废话）
	start := strings.Index(trimmed, "{")
	end := strings.LastIndex(trimmed, "}")
	if start < 0 || end <= start {
		return fmt.Errorf("no json object in llm response: %.100s", text)
	}
	return json.Unmarshal([]byte(trimmed[start:end+1]), out)
}

// ---- Anthropic Messages API 实现 ----

// AnthropicClient 直连 Anthropic Messages API。
type AnthropicClient struct {
	apiKey     string
	model      string
	maxTokens  int
	httpClient *http.Client
}

// NewAnthropicClient 创建客户端；apiKey 为空返回 ErrLLMNotConfigured 的客户端由上层降级。
func NewAnthropicClient(apiKey, model string) *AnthropicClient {
	if model == "" {
		model = "claude-sonnet-4-20250514"
	}
	return &AnthropicClient{
		apiKey:    apiKey,
		model:     model,
		maxTokens: 4096,
		httpClient: &http.Client{
			Timeout: 120 * time.Second,
		},
	}
}

type anthropicRequest struct {
	Model     string    `json:"model"`
	MaxTokens int       `json:"max_tokens"`
	System    string    `json:"system,omitempty"`
	Messages  []Message `json:"messages"`
}

type anthropicResponse struct {
	Content []struct {
		Type string `json:"type"`
		Text string `json:"text"`
	} `json:"content"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error"`
}

// Complete 实现 LLMClient。
func (c *AnthropicClient) Complete(ctx context.Context, system string, messages []Message) (string, error) {
	if c.apiKey == "" {
		return "", ErrLLMNotConfigured
	}
	body, err := json.Marshal(anthropicRequest{
		Model:     c.model,
		MaxTokens: c.maxTokens,
		System:    system,
		Messages:  messages,
	})
	if err != nil {
		return "", err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.anthropic.com/v1/messages", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("x-api-key", c.apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("llm request: %w", err)
	}
	defer resp.Body.Close()
	respBody, err := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if err != nil {
		return "", fmt.Errorf("read llm response: %w", err)
	}
	if resp.StatusCode >= 400 {
		return "", fmt.Errorf("llm api status %d: %.200s", resp.StatusCode, string(respBody))
	}
	var parsed anthropicResponse
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return "", fmt.Errorf("parse llm response: %w", err)
	}
	if parsed.Error != nil {
		return "", fmt.Errorf("llm api error: %s", parsed.Error.Message)
	}
	for _, part := range parsed.Content {
		if part.Type == "text" {
			return part.Text, nil
		}
	}
	return "", errors.New("llm response has no text content")
}

// CompleteVision 多模态补全：图片 + 文本消息。
func (c *AnthropicClient) CompleteVision(ctx context.Context, system, userText string, images []VisionImage) (string, error) {
	if c.apiKey == "" {
		return "", ErrLLMNotConfigured
	}
	content := make([]map[string]any, 0, len(images)+1)
	for _, img := range images {
		content = append(content, map[string]any{
			"type": "image",
			"source": map[string]string{
				"type":      "base64",
				"media_type": img.MediaType,
				"data":      img.Base64,
			},
		})
	}
	content = append(content, map[string]string{"type": "text", "text": userText})

	body, err := json.Marshal(map[string]any{
		"model":      c.model,
		"max_tokens": c.maxTokens,
		"system":     system,
		"messages":   []map[string]any{{"role": "user", "content": content}},
	})
	if err != nil {
		return "", err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.anthropic.com/v1/messages", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("x-api-key", c.apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("llm vision request: %w", err)
	}
	defer resp.Body.Close()
	respBody, err := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if err != nil {
		return "", fmt.Errorf("read llm response: %w", err)
	}
	if resp.StatusCode >= 400 {
		return "", fmt.Errorf("llm api status %d: %.200s", resp.StatusCode, string(respBody))
	}
	var parsed anthropicResponse
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return "", fmt.Errorf("parse llm response: %w", err)
	}
	if parsed.Error != nil {
		return "", fmt.Errorf("llm api error: %s", parsed.Error.Message)
	}
	for _, part := range parsed.Content {
		if part.Type == "text" {
			return part.Text, nil
		}
	}
	return "", errors.New("llm response has no text content")
}

// ---- Mock 实现（MOCK_MODE / 单测） ----

// MockLLM 可编程桩：Func 为空时返回固定应答。
type MockLLM struct {
	Func func(system string, messages []Message) (string, error)
}

// NewMockLLM 创建 mock 客户端。
func NewMockLLM() *MockLLM { return &MockLLM{} }

// Complete 实现 LLMClient。
func (m *MockLLM) Complete(ctx context.Context, system string, messages []Message) (string, error) {
	if m.Func != nil {
		return m.Func(system, messages)
	}
	return `{"mock":true}`, nil
}

// CompleteVision 实现 VisionClient（mock 返回空结果结构）。
func (m *MockLLM) CompleteVision(ctx context.Context, system, userText string, images []VisionImage) (string, error) {
	return `{"strongMoments":[],"talkingHead":false,"bRoll":[],"duplicates":[]}`, nil
}
