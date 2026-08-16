package model

import (
	"time"

	"gorm.io/datatypes"
)

type Timeline struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	ProjectID   uint           `gorm:"not null;index" json:"projectId"`
	Version     int            `gorm:"not null" json:"version"`
	TimelineJSON datatypes.JSON `gorm:"type:jsonb;not null" json:"timelineJson"`
	Label       string         `json:"label"`
	CreatedAt   time.Time      `json:"createdAt"`
}
