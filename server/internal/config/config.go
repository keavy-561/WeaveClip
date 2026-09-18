package config

import (
	"fmt"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"

	"gopkg.in/yaml.v3"
)

type Config struct {
	Server struct {
		Port              int           `yaml:"port"`
		Mode              string        `yaml:"mode"` // debug | release
		RequestTimeout    time.Duration `yaml:"request_timeout"`       // 兼容字段：纳秒
		RequestTimeoutSec int           `yaml:"request_timeout_sec"`   // 推荐字段：秒
	} `yaml:"server"`

	Database struct {
		Host     string `yaml:"host"`
		Port     int    `yaml:"port"`
		User     string `yaml:"user"`
		Password string `yaml:"password"`
		DBName   string `yaml:"dbname"`
		SSLMode  string `yaml:"sslmode"`
	} `yaml:"database"`

	Redis struct {
		Addr     string `yaml:"addr"`
		DB       int    `yaml:"db"`
		Password string `yaml:"password"`
	} `yaml:"redis"`

	Storage struct {
		Provider  string `yaml:"provider"`
		Endpoint  string `yaml:"endpoint"`
		AccessKey string `yaml:"access_key"`
		SecretKey string `yaml:"secret_key"`
		Bucket    string `yaml:"bucket"`
		Region    string `yaml:"region"`
	} `yaml:"storage"`

	JWT struct {
		Secret string        `yaml:"secret"`
		Expiry time.Duration `yaml:"expiry"`
	} `yaml:"jwt"`

	AI struct {
		OpenAIKey    string `yaml:"openai_api_key"`
		AnthropicKey string `yaml:"anthropic_api_key"`
	} `yaml:"ai"`

	FFmpeg struct {
		BinaryPath  string `yaml:"binary_path"`
		FFprobePath string `yaml:"ffprobe_path"`
	} `yaml:"ffmpeg"`

	CORS struct {
		AllowedOrigins []string `yaml:"allowed_origins"`
	} `yaml:"cors"`
}

// Load 读取指定环境的配置文件（dev/prod）
func Load(env string) (*Config, error) {
	path := fmt.Sprintf("config/%s.yaml", env)
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read config %s: %w", path, err)
	}

	// ${VAR} 占位符展开（B04）：prod.yaml 的占位符由环境变量注入
	data = expandEnvPlaceholders(data)

	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("parse config: %w", err)
	}

	// 环境变量覆盖（优先级高于配置文件）
	overrideFromEnv(&cfg)

	return &cfg, nil
}

var envPlaceholderRe = regexp.MustCompile(`\$\{([A-Z0-9_]+)\}`)

// expandEnvPlaceholders 把 yaml 中的 ${VAR} 替换为环境变量值；
// 未设置的环境变量保留占位符原文，便于部署侧排错。
func expandEnvPlaceholders(data []byte) []byte {
	return envPlaceholderRe.ReplaceAllFunc(data, func(m []byte) []byte {
		key := envPlaceholderRe.FindSubmatch(m)[1]
		v, ok := os.LookupEnv(string(key))
		if !ok {
			return m
		}
		// 含 yaml 特殊字符时加引号，避免破坏解析
		if strings.ContainsAny(v, ":#{}[]&*!|>'\"%@`\n") {
			v = strconv.Quote(v)
		}
		return []byte(v)
	})
}

func overrideFromEnv(cfg *Config) {
	if v := os.Getenv("SERVER_PORT"); v != "" {
		if _, err := fmt.Sscanf(v, "%d", &cfg.Server.Port); err != nil {
			fmt.Printf("invalid SERVER_PORT %q: %v\n", v, err)
		}
	}
	if v := os.Getenv("DATABASE_HOST"); v != "" {
		cfg.Database.Host = v
	}
	if v := os.Getenv("DATABASE_PORT"); v != "" {
		if _, err := fmt.Sscanf(v, "%d", &cfg.Database.Port); err != nil {
			fmt.Printf("invalid DATABASE_PORT %q: %v\n", v, err)
		}
	}
	if v := os.Getenv("DATABASE_USER"); v != "" {
		cfg.Database.User = v
	}
	if v := os.Getenv("DATABASE_PASSWORD"); v != "" {
		cfg.Database.Password = v
	}
	if v := os.Getenv("DATABASE_DBNAME"); v != "" {
		cfg.Database.DBName = v
	}
	if v := os.Getenv("DATABASE_SSLMODE"); v != "" {
		cfg.Database.SSLMode = v
	}
	if v := os.Getenv("REDIS_ADDR"); v != "" {
		cfg.Redis.Addr = v
	}
	if v := os.Getenv("REDIS_DB"); v != "" {
		if _, err := fmt.Sscanf(v, "%d", &cfg.Redis.DB); err != nil {
			fmt.Printf("invalid REDIS_DB %q: %v\n", v, err)
		}
	}
	if v := os.Getenv("REDIS_PASSWORD"); v != "" {
		cfg.Redis.Password = v
	}
	if v := os.Getenv("STORAGE_PROVIDER"); v != "" {
		cfg.Storage.Provider = v
	}
	if v := os.Getenv("STORAGE_ENDPOINT"); v != "" {
		cfg.Storage.Endpoint = v
	}
	if v := os.Getenv("STORAGE_ACCESS_KEY"); v != "" {
		cfg.Storage.AccessKey = v
	}
	if v := os.Getenv("STORAGE_SECRET_KEY"); v != "" {
		cfg.Storage.SecretKey = v
	}
	if v := os.Getenv("STORAGE_BUCKET"); v != "" {
		cfg.Storage.Bucket = v
	}
	if v := os.Getenv("STORAGE_REGION"); v != "" {
		cfg.Storage.Region = v
	}
	if v := os.Getenv("JWT_SECRET"); v != "" {
		cfg.JWT.Secret = v
	}
	if v := os.Getenv("JWT_EXPIRY"); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			cfg.JWT.Expiry = d
		}
	}
	if v := os.Getenv("OPENAI_API_KEY"); v != "" {
		cfg.AI.OpenAIKey = v
	}
	if v := os.Getenv("ANTHROPIC_API_KEY"); v != "" {
		cfg.AI.AnthropicKey = v
	}
	if v := os.Getenv("FFMPEG_BINARY_PATH"); v != "" {
		cfg.FFmpeg.BinaryPath = v
	}
	if v := os.Getenv("FFPROBE_PATH"); v != "" {
		cfg.FFmpeg.FFprobePath = v
	}
	if v := os.Getenv("CORS_ALLOWED_ORIGINS"); v != "" {
		cfg.CORS.AllowedOrigins = strings.Split(v, ",")
		for i := range cfg.CORS.AllowedOrigins {
			cfg.CORS.AllowedOrigins[i] = strings.TrimSpace(cfg.CORS.AllowedOrigins[i])
		}
	}
}

// EffectiveRequestTimeout 返回生效的请求超时：
// 环境变量 SERVER_REQUEST_TIMEOUT > request_timeout_sec > request_timeout > 默认 30s。
func (c *Config) EffectiveRequestTimeout() time.Duration {
	if v := os.Getenv("SERVER_REQUEST_TIMEOUT"); v != "" {
		if d, err := time.ParseDuration(v); err == nil && d > 0 {
			return d
		}
	}
	if c.Server.RequestTimeoutSec > 0 {
		return time.Duration(c.Server.RequestTimeoutSec) * time.Second
	}
	if c.Server.RequestTimeout > 0 {
		return c.Server.RequestTimeout
	}
	return 30 * time.Second
}

// DSN 返回 PostgreSQL 连接串
func (c *Config) DSN() string {
	return fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		c.Database.Host, c.Database.Port, c.Database.User,
		c.Database.Password, c.Database.DBName, c.Database.SSLMode,
	)
}
