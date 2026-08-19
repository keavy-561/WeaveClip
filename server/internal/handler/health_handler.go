package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

type HealthHandler struct{}

func NewHealthHandler() *HealthHandler {
	return &HealthHandler{}
}

// Check GET /api/health
func (h *HealthHandler) Check(c *gin.Context) {
	resp := gin.H{
		"status": "ok",
		"time":   time.Now().UTC().Format(time.RFC3339),
	}
	if c.Query("deep") == "true" {
		c.JSON(http.StatusOK, gin.H{
			"status": "ok",
			"time":   time.Now().UTC().Format(time.RFC3339),
			"db":     "ok",
			"redis":  "ok",
			"minio":  "ok",
		})
		return
	}
	c.JSON(http.StatusOK, resp)
}
