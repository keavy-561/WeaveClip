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
	if err != nil {
		NotFound(c, "render not found")
		return
	}
	if _, err := h.projects.GetProject(render.ProjectID, userID); err != nil {
		NotFound(c, "render not found")
		return
	}

	conn, err := h.upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}
	defer conn.Close()

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
