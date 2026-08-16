package model

import (
	"time"

	"gorm.io/datatypes"
)

type Asset struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	ProjectID    uint           `gorm:"not null;index" json:"projectId"`
	Type         string         `gorm:"not null" json:"type"` // video | audio | image
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
	CreatedAt    time.Time      `json:"createdAt"`
}
