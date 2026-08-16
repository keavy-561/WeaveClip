package model

import (
	"time"

	"gorm.io/datatypes"
)

type Edit struct {
	ID         uint           `gorm:"primaryKey" json:"id"`
	ProjectID  uint           `gorm:"not null;index" json:"projectId"`
	Message    string         `gorm:"not null" json:"message"`
	Operation  datatypes.JSON `gorm:"type:jsonb;not null" json:"operation"`
	BeforeJSON datatypes.JSON `gorm:"type:jsonb" json:"beforeJson"`
	AfterJSON  datatypes.JSON `gorm:"type:jsonb" json:"afterJson"`
	CreatedAt  time.Time      `json:"createdAt"`
}
