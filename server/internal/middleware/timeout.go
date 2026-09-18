package middleware

import (
	"net/http"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gin-gonic/gin"
)

// timeoutWriter 包装 gin.ResponseWriter：超时后拒绝处理器继续写入，
// 用互斥锁串行化超时响应与处理器写入，避免数据竞争。
type timeoutWriter struct {
	gin.ResponseWriter
	timedOut atomic.Bool
	mu       sync.Mutex
}

func (w *timeoutWriter) WriteHeader(code int) {
	if w.timedOut.Load() {
		return
	}
	w.mu.Lock()
	w.ResponseWriter.WriteHeader(code)
	w.mu.Unlock()
}

func (w *timeoutWriter) Write(b []byte) (int, error) {
	if w.timedOut.Load() {
		return 0, http.ErrHandlerTimeout
	}
	w.mu.Lock()
	defer w.mu.Unlock()
	return w.ResponseWriter.Write(b)
}

func (w *timeoutWriter) WriteString(s string) (int, error) {
	if w.timedOut.Load() {
		return 0, http.ErrHandlerTimeout
	}
	w.mu.Lock()
	defer w.mu.Unlock()
	return w.ResponseWriter.WriteString(s)
}

// RequestTimeout 为每个请求加处理时限：超时后向客户端返回 504，
// 处理器 goroutine 的后续写入会被丢弃。timeout <= 0 时不启用。
// 与 http.TimeoutHandler 同思路：处理器同步执行（请求 goroutine 等它返回，
// 保证 gin Context 的复用安全），超时响应由定时器 goroutine 抢先写出。
func RequestTimeout(timeout time.Duration) gin.HandlerFunc {
	if timeout <= 0 {
		return func(c *gin.Context) {
			c.Next()
		}
	}
	return func(c *gin.Context) {
		tw := &timeoutWriter{ResponseWriter: c.Writer}
		c.Writer = tw
		timer := time.AfterFunc(timeout, func() {
			if tw.timedOut.CompareAndSwap(false, true) {
				header := tw.ResponseWriter.Header()
				header.Set("Content-Type", "application/json; charset=utf-8")
				tw.ResponseWriter.WriteHeader(http.StatusGatewayTimeout)
				_, _ = tw.ResponseWriter.Write([]byte(
					`{"success":false,"code":"GATEWAY_TIMEOUT","message":"request timeout","request_id":""}`))
			}
		})
		defer timer.Stop()
		c.Next()
	}
}
