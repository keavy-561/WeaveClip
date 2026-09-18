// Package queue 异步任务队列：真实模式走 Asynq(Redis)，mock 模式用内联 goroutine 执行器（工单 B14）。
package queue

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/hibiken/asynq"
)

// 任务类型常量。
const (
	TypeAnalyze = "analyze:project"
	TypeRender  = "render:render"
)

// Handler 任务处理器：payload 为 JSON 编码的任务参数。
type Handler func(ctx context.Context, payload []byte) error

// Queue 任务队列门面。
type Queue struct {
	mock    bool
	client  *asynq.Client
	mux     *asynq.ServeMux
	handlers map[string]Handler
	redisOpt asynq.RedisClientOpt
	nextID  int64
}

// New 创建队列：redisAddr 为空时进入 mock 模式（内联执行，无需 Redis）。
func New(redisAddr string) *Queue {
	q := &Queue{handlers: map[string]Handler{}}
	if redisAddr == "" {
		q.mock = true
		q.mux = asynq.NewServeMux()
		return q
	}
	q.redisOpt = asynq.RedisClientOpt{Addr: redisAddr}
	q.client = asynq.NewClient(q.redisOpt)
	q.mux = asynq.NewServeMux()
	return q
}

// Mock reports whether the queue runs in inline mock mode.
func (q *Queue) Mock() bool { return q.mock }

// Register 注册任务处理器（两种模式共用同一份注册逻辑）。
func (q *Queue) Register(typeName string, h Handler) {
	q.handlers[typeName] = h
	q.mux.HandleFunc(typeName, func(ctx context.Context, t *asynq.Task) error {
		return h(ctx, t.Payload())
	})
}

// Enqueue 入队：mock 模式直接 goroutine 内联执行。
func (q *Queue) Enqueue(ctx context.Context, typeName string, payload any) (string, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("marshal task payload: %w", err)
	}
	if q.mock {
		q.nextID++
		taskID := fmt.Sprintf("inline-%s-%d", typeName, q.nextID)
		if h, ok := q.handlers[typeName]; ok {
			go func() {
				defer func() {
					if r := recover(); r != nil {
						slog.Error("inline task panic", "type", typeName, "panic", r)
					}
				}()
				if err := h(context.Background(), data); err != nil {
					slog.Error("inline task failed", "type", typeName, "error", err)
				}
			}()
		}
		return taskID, nil
	}
	info, err := q.client.EnqueueContext(ctx, asynq.NewTask(typeName, data),
		asynq.MaxRetry(3), asynq.Timeout(15*time.Minute), asynq.Queue(typeName))
	if err != nil {
		return "", fmt.Errorf("enqueue %s: %w", typeName, err)
	}
	return info.ID, nil
}

// RunWorker 启动 worker 消费循环（阻塞）；mock 模式无 worker。
func (q *Queue) RunWorker() error {
	if q.mock {
		return fmt.Errorf("queue: worker not available in mock mode")
	}
	srv := asynq.NewServer(q.redisOpt, asynq.Config{
		Concurrency: 2,
		Queues: map[string]int{
			TypeAnalyze: 5,
			TypeRender:  5,
		},
	})
	return srv.Run(q.mux)
}
