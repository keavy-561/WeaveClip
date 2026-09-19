package handler

import (
	"context"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/weaveclip/server/internal/storage"
)

// HealthHandler 健康检查：deep=true 时真实探测 DB / Redis / 对象存储（工单 B02）。
type HealthHandler struct {
	db        *gorm.DB
	redisAddr string
	store     storage.Storage
}

// NewHealthHandler 创建健康检查处理器；db 为 nil 表示 MOCK_MODE。
func NewHealthHandler(db *gorm.DB, redisAddr string, store storage.Storage) *HealthHandler {
	return &HealthHandler{db: db, redisAddr: redisAddr, store: store}
}

// Check GET /api/health
func (h *HealthHandler) Check(c *gin.Context) {
	now := time.Now().UTC().Format(time.RFC3339)
	if c.Query("deep") != "true" {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "time": now})
		return
	}

	mockMode := h.db == nil
	var dbStatus, redisStatus, storageStatus string
	if mockMode {
		// mock 模式不依赖外部组件，直接报告 mock 状态
		dbStatus, redisStatus, storageStatus = "mock", "mock", "mock"
	} else {
		dbStatus = probeDB(c.Request.Context(), h.db)
		redisStatus = probeRedis(h.redisAddr)
		storageStatus = probeStorage(c.Request.Context(), h.store)
	}

	status := "ok"
	httpCode := http.StatusOK
	if dbStatus == "fail" || redisStatus == "fail" || storageStatus == "fail" {
		status = "degraded"
		httpCode = http.StatusServiceUnavailable
	}
	c.JSON(httpCode, gin.H{
		"status":  status,
		"time":    now,
		"db":      dbStatus,
		"redis":   redisStatus,
		"storage": storageStatus,
	})
}

func probeDB(ctx context.Context, db *gorm.DB) string {
	sqlDB, err := db.DB()
	if err != nil {
		return "fail"
	}
	pingCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	if err := sqlDB.PingContext(pingCtx); err != nil {
		return "fail"
	}
	return "ok"
}

// probeRedis 用最小 TCP 协议探测（免引入 redis 客户端依赖）。
func probeRedis(addr string) string {
	if addr == "" {
		return "disabled"
	}
	conn, err := net.DialTimeout("tcp", addr, 2*time.Second)
	if err != nil {
		return "fail"
	}
	defer conn.Close()
	if err := conn.SetDeadline(time.Now().Add(2 * time.Second)); err != nil {
		return "fail"
	}
	if _, err := conn.Write([]byte("*1\r\n$4\r\nPING\r\n")); err != nil {
		return "fail"
	}
	buf := make([]byte, 32)
	n, err := conn.Read(buf)
	if err != nil || !strings.Contains(string(buf[:n]), "+PONG") {
		return "fail"
	}
	return "ok"
}

func probeStorage(ctx context.Context, store storage.Storage) string {
	if store == nil {
		return "disabled"
	}
	pingCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	if err := store.Ping(pingCtx); err != nil {
		return "fail"
	}
	return "ok"
}
