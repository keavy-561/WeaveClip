package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// tokenBucket 单 IP 令牌桶。
type tokenBucket struct {
	tokens float64
	last   time.Time
}

// RateLimit 全局限流（每 IP 令牌桶）：perSecond 为每秒补充速率，burst 为桶容量。
// 手写实现避免新增依赖（工单 WO11-04）；桶数超过阈值时整体重置（极端量级的粗暴自保护）。
func RateLimit(perSecond, burst float64) gin.HandlerFunc {
	var mu sync.Mutex
	buckets := map[string]*tokenBucket{}
	return func(c *gin.Context) {
		ip := c.ClientIP()
		now := time.Now()
		mu.Lock()
		if len(buckets) > 8192 {
			buckets = map[string]*tokenBucket{}
		}
		b, ok := buckets[ip]
		if !ok {
			b = &tokenBucket{tokens: burst, last: now}
			buckets[ip] = b
		}
		b.tokens += now.Sub(b.last).Seconds() * perSecond
		if b.tokens > burst {
			b.tokens = burst
		}
		b.last = now
		allowed := b.tokens >= 1
		if allowed {
			b.tokens--
		}
		mu.Unlock()
		if !allowed {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, map[string]any{
				"success":    false,
				"code":       "RATE_LIMITED",
				"message":    "too many requests",
				"request_id": "",
			})
			return
		}
		c.Next()
	}
}
