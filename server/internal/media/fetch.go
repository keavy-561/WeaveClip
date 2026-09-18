package media

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/weaveclip/server/internal/storage"
)

// FetchObject 把存储对象经预签名 URL 下载到本地临时文件（分析/渲染管线共用）。
// 返回临时文件路径与清理函数；maxBytes 限制下载大小。
func FetchObject(ctx context.Context, store storage.Storage, key string, maxBytes int64) (string, func(), error) {
	getURL, err := store.PresignGet(ctx, key, time.Hour)
	if err != nil {
		return "", nil, fmt.Errorf("presign get %s: %w", key, err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, getURL, nil)
	if err != nil {
		return "", nil, err
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", nil, fmt.Errorf("fetch object %s: %w", key, err)
	}
	defer resp.Body.Close()

	tmp, err := os.CreateTemp("", "weaveclip-obj-*"+filepath.Ext(key))
	if err != nil {
		return "", nil, fmt.Errorf("create temp file: %w", err)
	}
	cleanup := func() { os.Remove(tmp.Name()) }
	_, copyErr := io.Copy(tmp, io.LimitReader(resp.Body, maxBytes))
	closeErr := tmp.Close()
	if copyErr != nil {
		cleanup()
		return "", nil, fmt.Errorf("download object %s: %w", key, copyErr)
	}
	if closeErr != nil {
		cleanup()
		return "", nil, closeErr
	}
	return tmp.Name(), cleanup, nil
}
