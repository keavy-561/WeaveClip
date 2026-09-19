package handler

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"

	"github.com/weaveclip/server/internal/repository"
	"github.com/weaveclip/server/internal/service"
	"github.com/weaveclip/server/internal/ws"
)

// WSHandler 渲染进度 WebSocket 端点（工单 B19，D2：/ws/render/:renderId）。
type WSHandler struct {
	hub          *ws.Hub
	renderRepo   repository.RenderRepository
	projects     service.ProjectFinder
	upgrader     websocket.Upgrader
}

// NewWSHandler 创建 WebSocket 处理器。
func NewWSHandler(hub *ws.Hub, renderRepo repository.RenderRepository, projects service.ProjectFinder) *WSHandler {
	return &WSHandler{
		hub:        hub,
		renderRepo: renderRepo,
		projects:   projects,
		upgrader: websocket.Upgrader{
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
			// 鉴权已由 WSQueryAuth 中间件完成；Origin 交由 token 校验兜底
			CheckOrigin: func(r *http.Request) bool { return true },
		},
	}
}

// Render GET /ws/render/:renderId?token=<JWT>
func (h *WSHandler) Render(c *gin.Context) {
	renderID, ok := parseIDParam(c)
	if !ok {
		return
	}
	userID := currentUserID(c)

	// 属主校验：render → project → user
	render, err := h.renderRepo.Get(renderID)
	if err == nil {
		// 存在但非属主，视同不存在
		if _, projErr := h.projects.GetProject(render.ProjectID, userID); projErr != nil {
			err = projErr
		}
	}

	conn, err2 := h.upgrader.Upgrade(c.Writer, c.Request, nil)
	if err2 != nil {
		return
	}
	defer conn.Close()

	// 渲染任务不存在/越权：照常握手后推送 error 并关闭，
	// 避免前端在 mock 模式或渲染记录未落库时把"握手 404"误报为连接故障（走查 P2-WS）
	if err != nil {
		_ = conn.WriteJSON(map[string]any{
			"type": "error", "renderId": renderID, "error": "render not found",
		})
		return
	}

	messages, cancel := h.hub.Subscribe(fmt.Sprintf("%d", renderID))
	defer cancel()

	// 读泵：仅检测客户端断开
	go func() {
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				cancel()
				return
			}
		}
	}()

	for msg := range messages {
		if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
			return
		}
	}
}
