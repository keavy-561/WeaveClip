package model

import (
	"time"

	"gorm.io/datatypes"
)

type Generation struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	ProjectID uint           `gorm:"not null;index" json:"projectId"`
	Prompt    string         `gorm:"not null" json:"prompt"`
	Status    string         `gorm:"default:'pending'" json:"status"` // pending | processing | completed | failed
	Result    datatypes.JSON `gorm:"type:jsonb" json:"result"`
	Error     string         `json:"error"`
	CreatedAt time.Time      `json:"createdAt"`
}
