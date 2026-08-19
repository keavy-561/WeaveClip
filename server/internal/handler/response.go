package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// OK returns the data directly without an envelope.
func OK(c *gin.Context, data any) {
	c.JSON(http.StatusOK, data)
}

// Created returns the data directly without an envelope.
func Created(c *gin.Context, data any) {
	c.JSON(http.StatusCreated, data)
}

// Err returns a unified error response with request_id.
func Err(c *gin.Context, status int, code, message string) {
	requestID, _ := c.Get("request_id")
	rid, _ := requestID.(string)
	if rid == "" {
		rid = "unknown"
	}
	c.JSON(status, gin.H{
		"success":    false,
		"code":       code,
		"message":    message,
		"request_id": rid,
	})
}

func BadRequest(c *gin.Context, message string) {
	Err(c, http.StatusBadRequest, "BAD_REQUEST", message)
}

func Unauthorized(c *gin.Context, message string) {
	Err(c, http.StatusUnauthorized, "UNAUTHORIZED", message)
}

func NotFound(c *gin.Context, message string) {
	Err(c, http.StatusNotFound, "NOT_FOUND", message)
}

func Conflict(c *gin.Context, message string) {
	Err(c, http.StatusConflict, "CONFLICT", message)
}

func InternalError(c *gin.Context, message string) {
	Err(c, http.StatusInternalServerError, "INTERNAL_ERROR", message)
}
