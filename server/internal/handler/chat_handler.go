package handler

import (
	"errors"

	"github.com/gin-gonic/gin"

	"github.com/weaveclip/server/internal/service"
)

// ChatHandler 对话式编辑端点（工单 B13）。
type ChatHandler struct {
	chats *service.ChatService
}

// NewChatHandler 创建对话编辑处理器。
func NewChatHandler(chats *service.ChatService) *ChatHandler {
	return &ChatHandler{chats: chats}
}

type ChatRequest struct {
	Message        string `json:"message" binding:"required"`
	SelectedClipID string `json:"selectedClipId"`
}

// Chat POST /api/projects/:id/chat
func (h *ChatHandler) Chat(c *gin.Context) {
	projectID, ok := parseIDParam(c)
	if !ok {
		return
	}
	var req ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		BadRequest(c, "invalid request body")
		return
	}
	result, err := h.chats.Chat(projectID, currentUserID(c), req.Message, req.SelectedClipID)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrProjectNotFound):
			NotFound(c, "project not found")
		case errors.Is(err, service.ErrTimelineNotFound):
			BadRequest(c, "project has no timeline yet, generate or create one first")
		default:
			InternalError(c, "failed to process chat edit")
		}
		return
	}
	resp := gin.H{"message": result.Reply, "operations": result.Operations}
	if result.Timeline != nil {
		resp["timeline"] = gin.H{
			"version":      result.Timeline.Version,
			"timelineJson": result.Timeline.TimelineJSON,
		}
	}
	OK(c, resp)
}
