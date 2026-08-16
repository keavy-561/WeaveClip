package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// Response 统一响应结构
type Response struct {
	Success bool   `json:"success"`
	Data    any    `json:"data,omitempty"`
	Message string `json:"message,omitempty"`
}

func OK(c *gin.Context, data any) {
	c.JSON(http.StatusOK, Response{Success: true, Data: data})
}

func Created(c *gin.Context, data any) {
	c.JSON(http.StatusCreated, Response{Success: true, Data: data})
}

func Err(c *gin.Context, status int, message string) {
	c.JSON(status, Response{Success: false, Message: message})
}

func BadRequest(c *gin.Context, message string) {
	Err(c, http.StatusBadRequest, message)
}

func NotFound(c *gin.Context, message string) {
	Err(c, http.StatusNotFound, message)
}

func InternalError(c *gin.Context, message string) {
	Err(c, http.StatusInternalServerError, message)
}
