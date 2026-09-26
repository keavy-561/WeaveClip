package handler

import (
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
)

// MockStorageHandler 本地磁盘存储的回环端点：
// LocalDiskStorage 预签名返回 /api/mock-storage/<key>，浏览器直传 PUT 到这里。
// 仅在 mock/本地磁盘存储模式下注册，供开发与冒烟环境跑通 presign 直传链路。
type MockStorageHandler struct {
	root string
}

// NewMockStorageHandler 创建回环存储处理器。
func NewMockStorageHandler(root string) *MockStorageHandler {
	return &MockStorageHandler{root: root}
}

// resolve 把 key 解析为根目录内的安全路径，越界返回空串。
func (h *MockStorageHandler) resolve(key string) string {
	clean := filepath.Clean("/" + key)
	rel := strings.TrimPrefix(clean, "/")
	if rel == "" || rel == "." {
		return ""
	}
	return filepath.Join(h.root, filepath.FromSlash(rel))
}

// Handle 按 method 分发 PUT / GET / DELETE。
func (h *MockStorageHandler) Handle(c *gin.Context) {
	key := c.Param("key")
	switch c.Request.Method {
	case http.MethodPut:
		h.put(c, key)
	case http.MethodGet:
		h.get(c, key)
	case http.MethodDelete:
		h.delete(c, key)
	default:
		BadRequest(c, "unsupported method")
	}
}

// maxObjectSize 单对象上限，与 service.MaxUploadSize（500MB）对齐（工单 WO8-16）。
const maxObjectSize int64 = 500 << 20

func (h *MockStorageHandler) put(c *gin.Context, key string) {
	p := h.resolve(key)
	if p == "" {
		BadRequest(c, "invalid storage key")
		return
	}
	if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
		InternalError(c, "failed to create directory")
		return
	}
	// 流式写临时文件后 rename：不再把整个请求体（最大 600MB）缓冲进内存（工单 WO8-16）
	tmp, err := os.CreateTemp(filepath.Dir(p), ".upload-*")
	if err != nil {
		InternalError(c, "failed to create temp file")
		return
	}
	tmpName := tmp.Name()
	written, copyErr := io.Copy(tmp, io.LimitReader(c.Request.Body, maxObjectSize+1))
	closeErr := tmp.Close()
	if copyErr != nil || closeErr != nil {
		_ = os.Remove(tmpName)
		InternalError(c, "failed to read request body")
		return
	}
	if written > maxObjectSize {
		_ = os.Remove(tmpName)
		c.JSON(http.StatusRequestEntityTooLarge, gin.H{
			"success": false, "code": "PAYLOAD_TOO_LARGE",
			"message": "object exceeds size limit", "request_id": "",
		})
		return
	}
	if err := os.Rename(tmpName, p); err != nil {
		_ = os.Remove(tmpName)
		InternalError(c, "failed to write object")
		return
	}
	c.Status(http.StatusOK)
}

func (h *MockStorageHandler) get(c *gin.Context, key string) {
	p := h.resolve(key)
	if p == "" {
		BadRequest(c, "invalid storage key")
		return
	}
	if _, err := os.Stat(p); err != nil {
		NotFound(c, "object not found")
		return
	}
	c.File(p)
}

func (h *MockStorageHandler) delete(c *gin.Context, key string) {
	p := h.resolve(key)
	if p == "" {
		BadRequest(c, "invalid storage key")
		return
	}
	if err := os.Remove(p); err != nil && !os.IsNotExist(err) {
		InternalError(c, "failed to delete object")
		return
	}
	c.Status(http.StatusNoContent)
}
