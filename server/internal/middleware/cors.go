package middleware

import (
	"github.com/gin-gonic/gin"
)

// CORS sets CORS headers. If origins is empty, allows all.
func CORS(origins []string) gin.HandlerFunc {
	allowAll := len(origins) == 0
	allowOrigin := func(origin string) string {
		if allowAll {
			return "*"
		}
		for _, o := range origins {
			if o == origin {
				return origin
			}
		}
		return ""
	}
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		if allowed := allowOrigin(origin); allowed != "" {
			c.Header("Access-Control-Allow-Origin", allowed)
		}
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization, Accept")
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Max-Age", "86400")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
