package middleware

import (
	"net/http"
	"sync/atomic"
	"time"

	"github.com/gin-gonic/gin"
)

// timeoutWriter 包装 gin.ResponseWriter：超时后拒绝处理器继续写入，
// 避免超时响应与处理器写入产生数据竞争。Hijack/Flush 等方法透传内层。
type timeoutWriter struct {
	gin.ResponseWriter
	timedOut atomic.Bool
}

func (w *timeoutWriter) WriteHeader(code int) {
	if w.timedOut.Load() {
		return
	}
	w.ResponseWriter.WriteHeader(code)
}

func (w *timeoutWriter) Write(b []byte) (int, error) {
	if w.timedOut.Load() {
		return 0, http.ErrHandlerTimeout
	}
	return w.ResponseWriter.Write(b)
}

func (w *timeoutWriter) WriteString(s string) (int, error) {
	if w.timedOut.Load() {
		return 0, http.ErrHandlerTimeout
	}
	return w.ResponseWriter.WriteString(s)
}

// RequestTimeout 为每个请求加处理时限：超时后向客户端返回 504，
// 处理器 goroutine 的后续写入会被丢弃。timeout <= 0 时不启用。
func RequestTimeout(timeout time.Duration) gin.HandlerFunc {
	if timeout <= 0 {
		return func(c *gin.Context) {
			c.Next()
		}
	}
	return func(c *gin.Context) {
		tw := &timeoutWriter{ResponseWriter: c.Writer}
		c.Writer = tw
		done := make(chan struct{})
		go func() {
			defer close(done)
			// 处理器 panic 不允许击穿本 goroutine（链路上方的 Recovery 已
			// 不在本 goroutine 栈内），就地转为 500 响应。
			defer func() {
				if r := recover(); r != nil {
					if !tw.timedOut.Load() {
						tw.timedOut.Store(true)
						writePlainStatus(tw.ResponseWriter, http.StatusInternalServerError,
							`{"success":false,"code":"INTERNAL_ERROR","message":"internal server error","request_id":""}`)
					}
				}
			}()
			c.Next()
		}()
		select {
		case <-done:
		case <-time.After(timeout):
			tw.timedOut.Store(true)
			writePlainStatus(tw.ResponseWriter, http.StatusGatewayTimeout,
				`{"success":false,"code":"GATEWAY_TIMEOUT","message":"request timeout","request_id":""}`)
		}
	}
}

func writePlainStatus(w gin.ResponseWriter, status int, body string) {
	header := w.Header()
	header.Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_, _ = w.Write([]byte(body))
}
