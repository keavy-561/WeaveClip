package config

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// writeTestConfig 在临时目录构造 config/<env>.yaml，并切换工作目录。
func writeTestConfig(t *testing.T, content string) {
	t.Helper()
	dir := t.TempDir()
	require.NoError(t, os.MkdirAll(filepath.Join(dir, "config"), 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(dir, "config", "test.yaml"), []byte(content), 0o644))
	oldWd, err := os.Getwd()
	require.NoError(t, err)
	require.NoError(t, os.Chdir(dir))
	t.Cleanup(func() {
		_ = os.Chdir(oldWd)
	})
}

func TestLoad_ExpandsEnvPlaceholders(t *testing.T) {
	writeTestConfig(t, `
server:
  port: 8080
  mode: debug
database:
  host: ${DB_HOST}
  port: ${DB_PORT}
  user: weaveclip
  password: ${DB_PASSWORD}
`)
	// 隔离 CI 环境变量（overrideFromEnv 会覆盖同名字段）
	t.Setenv("DATABASE_HOST", "")
	t.Setenv("DB_HOST", "db.example.com")
	t.Setenv("DB_PORT", "6543")
	t.Setenv("DB_PASSWORD", "p@ss:word")

	cfg, err := Load("test")
	require.NoError(t, err)
	assert.Equal(t, "db.example.com", cfg.Database.Host)
	assert.Equal(t, 6543, cfg.Database.Port)
	assert.Equal(t, "p@ss:word", cfg.Database.Password)
}

func TestLoad_UnsetPlaceholderKeptLiteral(t *testing.T) {
	t.Setenv("DATABASE_HOST", "")
	writeTestConfig(t, `
server:
  port: 8080
database:
  host: ${DB_HOST_UNSET_VAR}
`)
	cfg, err := Load("test")
	require.NoError(t, err)
	assert.Equal(t, "${DB_HOST_UNSET_VAR}", cfg.Database.Host)
}

func TestLoad_EnvOverrideWins(t *testing.T) {
	writeTestConfig(t, `
server:
  port: 8080
database:
  host: yaml-host
`)
	t.Setenv("DATABASE_HOST", "env-host")
	t.Setenv("STORAGE_ENDPOINT", "minio.internal:9000")
	t.Setenv("ANTHROPIC_API_KEY", "sk-ant-test")

	cfg, err := Load("test")
	require.NoError(t, err)
	assert.Equal(t, "env-host", cfg.Database.Host)
	assert.Equal(t, "minio.internal:9000", cfg.Storage.Endpoint)
	assert.Equal(t, "sk-ant-test", cfg.AI.AnthropicKey)
}

func TestEffectiveRequestTimeout(t *testing.T) {
	cfg := &Config{}
	// 默认 30s
	assert.Equal(t, 30*time.Second, cfg.EffectiveRequestTimeout())

	// request_timeout_sec 优先于默认
	cfg.Server.RequestTimeoutSec = 60
	assert.Equal(t, 60*time.Second, cfg.EffectiveRequestTimeout())

	// 环境变量优先级最高
	t.Setenv("SERVER_REQUEST_TIMEOUT", "5s")
	assert.Equal(t, 5*time.Second, cfg.EffectiveRequestTimeout())
}
