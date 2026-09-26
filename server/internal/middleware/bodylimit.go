package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// bodyLimitExemptPrefixes 不限请求体大小的路由：本地直传端点（大文件流式）与 WS（工单 WO11-04）。
var bodyLimitExemptPrefixes = []string{
	"/api/mock-storage/",
	"/ws/",
}

// BodyLimit 请求体大小上限：超限读取报错，防止 JSON 接口被超大 payload 打爆（工单 WO11-04）。
// 大文件直传（/api/mock-storage/）与 WS 豁免。
func BodyLimit(maxBytes int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		if fp := c.FullPath(); fp != "" {
			for _, prefix := range bodyLimitExemptPrefixes {
				if strings.HasPrefix(fp, prefix) {
					c.Next()
					return
				}
			}
		}
		if c.Request.Body != nil {
			c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes)
		}
		c.Next()
	}
}
