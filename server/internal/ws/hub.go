// Package WebSocket Hub：渲染进度推送（工单 B19）。
package ws

import (
	"encoding/json"
	"log/slog"
	"sync"
)

// Hub 按 renderID 维护 WebSocket 连接组，广播渲染进度。
type Hub struct {
	mu    sync.RWMutex
	conns map[string]map[chan []byte]struct{}
}

// NewHub 创建 Hub。
func NewHub() *Hub {
	return &Hub{conns: map[string]map[chan []byte]struct{}{}}
}

// Subscribe 订阅某渲染任务的推送；返回接收通道与取消函数。
func (h *Hub) Subscribe(renderID string) (<-chan []byte, func()) {
	ch := make(chan []byte, 16)
	h.mu.Lock()
	if h.conns[renderID] == nil {
		h.conns[renderID] = map[chan []byte]struct{}{}
	}
	h.conns[renderID][ch] = struct{}{}
	h.mu.Unlock()
	cancel := func() {
		h.mu.Lock()
		if set, ok := h.conns[renderID]; ok {
			delete(set, ch)
			if len(set) == 0 {
				delete(h.conns, renderID)
			}
		}
		h.mu.Unlock()
		close(ch)
	}
	return ch, cancel
}

// BroadcastRaw 向指定渲染任务的所有订阅者推送原始 JSON 消息。
func (h *Hub) BroadcastRaw(renderID string, data []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for ch := range h.conns[renderID] {
		select {
		case ch <- data:
		default:
		}
	}
}

// Broadcast 向指定渲染任务的所有订阅者推送 JSON 消息。
func (h *Hub) Broadcast(renderID string, payload any) {
	data, err := json.Marshal(payload)
	if err != nil {
		slog.Error("ws broadcast marshal", "renderId", renderID, "error", err)
		return
	}
	h.mu.RLock()
	defer h.mu.RUnlock()
	for ch := range h.conns[renderID] {
		select {
		case ch <- data:
		default:
			// 订阅者消费过慢则丢弃本条进度（进度消息可容忍丢失，有轮询兜底）
		}
	}
}
