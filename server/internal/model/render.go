package model

import "time"

type Render struct {
	ID          uint       `gorm:"primaryKey" json:"id"`
	ProjectID   uint       `gorm:"not null;index" json:"projectId"`
	Format      string     `gorm:"default:'mp4'" json:"format"`
	Resolution  string     `gorm:"default:'1080x1920'" json:"resolution"`
	FPS         int        `gorm:"default:30" json:"fps"`
	Status      string     `gorm:"default:'pending'" json:"status"` // pending | rendering | completed | failed
	Progress    int        `gorm:"default:0" json:"progress"`
	DownloadURL string     `json:"downloadUrl"`
	FileSize    int64      `json:"fileSize"`
	Error       string     `json:"error"`
	CreatedAt   time.Time  `json:"createdAt"`
	CompletedAt *time.Time `json:"completedAt"`
}
