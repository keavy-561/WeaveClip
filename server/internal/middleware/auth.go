package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// Auth validates the Bearer JWT and sets user_id in context.
// If token is missing or invalid, it aborts with 401.
func Auth() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			abortUnauthorized(c, "missing authorization header")
			return
		}
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			abortUnauthorized(c, "invalid authorization header")
			return
		}
		tokenString := parts[1]
		userID, err := ParseToken(tokenString)
		if err != nil {
			abortUnauthorized(c, "invalid token")
			return
		}
		c.Set("user_id", userID)
		c.Next()
	}
}

// WSQueryAuth extracts token from ?token= query parameter for WebSocket handshake.
func WSQueryAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := c.Query("token")
		if token == "" {
			abortUnauthorized(c, "missing token")
			return
		}
		userID, err := ParseToken(token)
		if err != nil {
			abortUnauthorized(c, "invalid token")
			return
		}
		c.Set("user_id", userID)
		c.Next()
	}
}

func abortUnauthorized(c *gin.Context, msg string) {
	requestID, _ := c.Get("request_id")
	rid, _ := requestID.(string)
	if rid == "" {
		rid = "unknown"
	}
	c.JSON(http.StatusUnauthorized, gin.H{
		"success":    false,
		"code":       "UNAUTHORIZED",
		"message":    msg,
		"request_id": rid,
	})
	c.Abort()
}
