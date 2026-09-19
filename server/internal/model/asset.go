package model

import (
	"time"

	"gorm.io/datatypes"
)

type Asset struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	ProjectID    uint           `gorm:"not null;index" json:"projectId"`
	Type         string         `gorm:"not null" json:"type"`                          // video | audio | image
	Status       string         `gorm:"default:'ready'" json:"status"`                 // uploading | ready | failed（002 迁移）
	StoragePath  string         `gorm:"not null" json:"storagePath"`
	FileName     string         `gorm:"not null" json:"fileName"`
	FileSize     int64          `json:"fileSize"`
	Duration     float64        `json:"duration"`
	Width        int            `json:"width"`
	Height       int            `json:"height"`
	ThumbnailURL string         `json:"thumbnailUrl"`
	FPS          float64        `json:"fps"`
	Codec        string         `json:"codec"`
	Transcript   datatypes.JSON `gorm:"type:jsonb" json:"transcript"`
	Metadata     datatypes.JSON `gorm:"type:jsonb" json:"metadata"`
	Analysis     datatypes.JSON `gorm:"type:jsonb" json:"analysis"`
	// PlaybackURL 非持久化：响应时由服务层经存储预签名生成，前端播放器直接使用
	PlaybackURL string `gorm:"-" json:"playbackUrl,omitempty"`
	CreatedAt    time.Time      `json:"createdAt"`
}
