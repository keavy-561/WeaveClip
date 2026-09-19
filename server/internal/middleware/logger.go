package middleware

import (
	"log/slog"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// Logger 结构化请求日志
func Logger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		query := c.Request.URL.RawQuery

		c.Next()

		latency := time.Since(start)
		status := c.Writer.Status()

		attrs := []any{
			"status", status,
			"method", c.Request.Method,
			"path", path,
			"latency", latency.String(),
			"ip", c.ClientIP(),
		}
		if query != "" {
			attrs = append(attrs, "query", redactSensitiveQuery(query))
		}
		if len(c.Errors) > 0 {
			attrs = append(attrs, "errors", c.Errors.String())
		}

		switch {
		case status >= 500:
			slog.Error("request", attrs...)
		case status >= 400:
			slog.Warn("request", attrs...)
		default:
			slog.Info("request", attrs...)
		}
	}
}

// redactSensitiveQuery 脱敏查询串中的敏感参数（WS 鉴权 token 等），
// 避免 JWT 泄入访问日志后被复用（工单 WO8-05）。
func redactSensitiveQuery(query string) string {
	parts := strings.Split(query, "&")
	for i, part := range parts {
		if strings.HasPrefix(part, "token=") {
			parts[i] = "token=REDACTED"
		}
	}
	return strings.Join(parts, "&")
}
