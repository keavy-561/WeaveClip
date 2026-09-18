package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// timeoutWriter 包装 gin.ResponseWriter：超时后拒绝处理器继续写入。
// 所有底层写入（含超时响应）都在同一把锁下串行，避免数据竞争。
type timeoutWriter struct {
	gin.ResponseWriter
	mu        sync.Mutex
	timedOut  bool
	written   bool
}

func (w *timeoutWriter) markWritten() {
	w.written = true
}

func (w *timeoutWriter) WriteHeader(code int) {
	w.mu.Lock()
	defer w.mu.Unlock()
	if w.timedOut {
		return
	}
	w.markWritten()
	w.ResponseWriter.WriteHeader(code)
}

func (w *timeoutWriter) Write(b []byte) (int, error) {
	w.mu.Lock()
	defer w.mu.Unlock()
	if w.timedOut {
		return 0, http.ErrHandlerTimeout
	}
	w.markWritten()
	return w.ResponseWriter.Write(b)
}

func (w *timeoutWriter) WriteString(s string) (int, error) {
	w.mu.Lock()
	defer w.mu.Unlock()
	if w.timedOut {
		return 0, http.ErrHandlerTimeout
	}
	w.markWritten()
	return w.ResponseWriter.WriteString(s)
}

// writeTimeoutResponse 在持锁状态下写出 504；不触碰 Header map（避免与
// 处理器 goroutine 的 header 访问产生竞争），状态码本身已足够表达超时。
func (w *timeoutWriter) writeTimeoutResponse() {
	w.mu.Lock()
	defer w.mu.Unlock()
	if w.timedOut || w.written {
		// 已写过超时响应，或处理器已有正常输出
		return
	}
	w.timedOut = true
	w.ResponseWriter.WriteHeader(http.StatusGatewayTimeout)
	_, _ = w.ResponseWriter.Write([]byte(
		`{"success":false,"code":"GATEWAY_TIMEOUT","message":"request timeout","request_id":""}`))
}

// RequestTimeout 为每个请求加处理时限：超时后向客户端返回 504，
// 处理器的后续写入会被丢弃。timeout <= 0 时不启用。
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
		timer := time.AfterFunc(timeout, tw.writeTimeoutResponse)
		defer timer.Stop()
		c.Next()
	}
}
