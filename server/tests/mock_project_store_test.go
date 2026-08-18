package tests

import (
	"testing"
	"time"

	"github.com/weaveclip/server/internal/handler"
	"github.com/weaveclip/server/internal/model"
)

func TestMockProjectStore(t *testing.T) {
	// Simulate what happens in the smoke test:
	// 1. Server starts, mockProjectStore is initialized with seeded projects
	// 2. User creates a project
	// 3. User lists projects

	// Reset the mock store to simulate a fresh server start
	handler.ResetMockProjectStoreForTest()

	// Create a project for user 1
	now := time.Now()
	project := model.Project{
		ID:         999,
		Name:       "Test Project",
		UserID:     1,
		Status:     "draft",
		CreatedAt:  now,
		UpdatedAt:  now,
	}
	handler.AddMockProjectForTest(project)

	// List projects for user 1
	projects := handler.FilterMockProjectsForTest(1)

	// Check that the created project is in the list
	found := false
	for _, p := range projects {
		if p.ID == 999 {
			found = true
			break
		}
	}

	if !found {
		t.Fatal("created project not found in list for user 1")
	}

	// Check that user 2 doesn't see user 1's projects
	projects2 := handler.FilterMockProjectsForTest(2)
	for _, p := range projects2 {
		if p.ID == 999 {
			t.Fatal("user 2 should not see user 1's project")
		}
	}
}
