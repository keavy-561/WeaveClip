package middleware

import (
	"net/http"
	"runtime/debug"

	"github.com/gin-gonic/gin"
)

// Recover catches panics and returns a JSON error with request_id.
func Recover() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if r := recover(); r != nil {
				requestID, _ := c.Get("request_id")
				rid, _ := requestID.(string)
				if rid == "" {
					rid = "unknown"
				}
				_ = r
				_ = debug.Stack()
				c.JSON(http.StatusInternalServerError, gin.H{
					"success":    false,
					"code":       "INTERNAL_ERROR",
					"message":    "internal server error",
					"request_id": rid,
				})
				c.Abort()
			}
		}()
		c.Next()
	}
}
