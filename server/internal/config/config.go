package config

import (
	"fmt"
	"os"
	"strings"
	"time"

	"gopkg.in/yaml.v3"
)

type Config struct {
	Server struct {
		Port         int           `yaml:"port"`
		Mode         string        `yaml:"mode"` // debug | release
		RequestTimeout time.Duration `yaml:"request_timeout"`
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

	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("parse config: %w", err)
	}

	// 环境变量覆盖（prod 模式下 ${VAR} 占位符由部署层注入，这里做简单兜底）
	overrideFromEnv(&cfg)

	return &cfg, nil
}

func overrideFromEnv(cfg *Config) {
	if v := os.Getenv("SERVER_PORT"); v != "" {
		if _, err := fmt.Sscanf(v, "%d", &cfg.Server.Port); err != nil {
			fmt.Printf("invalid SERVER_PORT %q: %v\n", v, err)
		}
	}
	if v := os.Getenv("SERVER_REQUEST_TIMEOUT"); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			cfg.Server.RequestTimeout = d
		}
	}
	if v := os.Getenv("DATABASE_HOST"); v != "" {
		cfg.Database.Host = v
	}
	if v := os.Getenv("DATABASE_PASSWORD"); v != "" {
		cfg.Database.Password = v
	}
	if v := os.Getenv("REDIS_ADDR"); v != "" {
		cfg.Redis.Addr = v
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
	if v := os.Getenv("CORS_ALLOWED_ORIGINS"); v != "" {
		cfg.CORS.AllowedOrigins = strings.Split(v, ",")
		for i := range cfg.CORS.AllowedOrigins {
			cfg.CORS.AllowedOrigins[i] = strings.TrimSpace(cfg.CORS.AllowedOrigins[i])
		}
	}
}

// DSN 返回 PostgreSQL 连接串
func (c *Config) DSN() string {
	return fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		c.Database.Host, c.Database.Port, c.Database.User,
		c.Database.Password, c.Database.DBName, c.Database.SSLMode,
	)
}
