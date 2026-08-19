package middleware

import (
	"crypto/rand"
	"encoding/hex"
	"strings"

	"github.com/gin-gonic/gin"
)

// RequestID generates or propagates an X-Request-ID.
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		rid := c.GetHeader("X-Request-ID")
		if rid == "" {
			buf := make([]byte, 8)
			if _, err := rand.Read(buf); err == nil {
				rid = hex.EncodeToString(buf)
			} else {
				rid = "req-" + strings.ReplaceAll(c.Request.RemoteAddr, ":", "")
			}
		}
		c.Header("X-Request-ID", rid)
		c.Set("request_id", rid)
		c.Next()
	}
}
