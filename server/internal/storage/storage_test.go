package storage

import (
	"context"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLocalDiskStorage_PutExistsGetDelete(t *testing.T) {
	s, err := NewLocalDiskStorage(t.TempDir(), "http://localhost:9999")
	require.NoError(t, err)
	ctx := context.Background()

	// 初始不存在
	ok, size, err := s.Exists(ctx, "projects/1/a.txt")
	require.NoError(t, err)
	assert.False(t, ok)
	assert.Equal(t, int64(0), size)

	// 写入
	require.NoError(t, s.Put(ctx, "projects/1/a.txt", strings.NewReader("hello"), 5, "text/plain"))
	ok, size, err = s.Exists(ctx, "projects/1/a.txt")
	require.NoError(t, err)
	assert.True(t, ok)
	assert.Equal(t, int64(5), size)

	// 预签名 URL 形如 /api/mock-storage/<key>
	putURL, err := s.PresignPut(ctx, "projects/1/a.txt", 0)
	require.NoError(t, err)
	assert.Equal(t, "http://localhost:9999/api/mock-storage/projects/1/a.txt", putURL)
	getURL, err := s.PresignGet(ctx, "projects/1/a.txt", 0)
	require.NoError(t, err)
	assert.Contains(t, getURL, "/api/mock-storage/projects/1/a.txt")

	// 删除
	require.NoError(t, s.Delete(ctx, "projects/1/a.txt"))
	ok, _, err = s.Exists(ctx, "projects/1/a.txt")
	require.NoError(t, err)
	assert.False(t, ok)
}

func TestLocalDiskStorage_PathTraversalRejected(t *testing.T) {
	s, err := NewLocalDiskStorage(t.TempDir(), "")
	require.NoError(t, err)

	err = s.Put(context.Background(), "../evil.txt", strings.NewReader("x"), 1, "")
	assert.Error(t, err)

	_, _, err = s.Exists(context.Background(), "a/../../evil.txt")
	assert.Error(t, err)
}

func TestLocalDiskStorage_Ping(t *testing.T) {
	s, err := NewLocalDiskStorage(t.TempDir(), "")
	require.NoError(t, err)
	assert.NoError(t, s.Ping(context.Background()))
}
