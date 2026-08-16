package model

import "time"

type Project struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	UserID      uint      `gorm:"not null;index" json:"userId"`
	Name        string    `gorm:"not null" json:"name"`
	Status      string    `gorm:"default:'draft'" json:"status"` // draft | analyzing | generating | ready | rendering
	Duration    int       `json:"duration"`                      // 目标时长（秒）
	AspectRatio string    `gorm:"default:'9:16'" json:"aspectRatio"`
	Style       string    `gorm:"default:'cinematic'" json:"style"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}
