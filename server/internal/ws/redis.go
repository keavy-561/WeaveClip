package ws

import (
	"context"
	"encoding/json"
	"log/slog"
	"strings"

	"github.com/redis/go-redis/v9"
)

// RenderNotifier 渲染进度通知回调（jobs 包使用）。
type RenderNotifier func(renderID string, payload any)

// RedisNotifier 跨进程通知：worker/server 经 Redis pub/sub 转发进度。
func RedisNotifier(addr string) RenderNotifier {
	rdb := redis.NewClient(&redis.Options{Addr: addr})
	return func(renderID string, payload any) {
		data, err := json.Marshal(payload)
		if err != nil {
			return
		}
		ctx, cancel := context.WithTimeout(context.Background(), 5e9)
		defer cancel()
		if err := rdb.Publish(ctx, "ws:render:"+renderID, data).Err(); err != nil {
			slog.Warn("redis publish render progress failed", "renderId", renderID, "error", err)
		}
	}
}

// StartRedisBridge server 侧订阅渲染进度频道并转发到本地 Hub。
// worker 进程发布 → server 桥接 → WebSocket 客户端。
func StartRedisBridge(addr string, hub *Hub) {
	rdb := redis.NewClient(&redis.Options{Addr: addr})
	ctx := context.Background()
	pubsub := rdb.PSubscribe(ctx, "ws:render:*")
	go func() {
		defer pubsub.Close()
		slog.Info("redis render bridge started", "addr", addr)
		for msg := range pubsub.Channel() {
			renderID := strings.TrimPrefix(msg.Channel, "ws:render:")
			hub.BroadcastRaw(renderID, []byte(msg.Payload))
		}
	}()
}
