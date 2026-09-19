package model

import (
	"time"

	"gorm.io/datatypes"
)

// TaskResult 异步任务轨迹（分析/生成/渲染共用，development-plan §8.1）。
type TaskResult struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	TaskType  string         `gorm:"not null" json:"taskType"` // analyze | generate | render
	TaskID    string         `gorm:"uniqueIndex" json:"taskId"`
	ProjectID uint           `gorm:"not null;index" json:"projectId"`
	Status    string         `gorm:"default:'pending'" json:"status"` // pending | running | completed | failed
	Progress  int            `gorm:"default:0" json:"progress"`
	Result    datatypes.JSON `gorm:"type:jsonb" json:"result"`
	Error     string         `json:"error"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
}
