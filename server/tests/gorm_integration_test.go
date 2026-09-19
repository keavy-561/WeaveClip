package tests

// repository 层 GORM 集成测试（工单 B20/WO2-08）：
// CI 环境注入 DATABASE_* 时跑真实 PostgreSQL 链路；本地无数据库时跳过。

import (
	"database/sql"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/weaveclip/server/internal/model"
	"github.com/weaveclip/server/internal/repository"
	"github.com/weaveclip/server/migrations"
)

// openTestDB 打开 CI 提供的 PostgreSQL 连接；无环境变量时跳过测试。
func openTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	host := os.Getenv("DATABASE_HOST")
	if host == "" {
		t.Skip("DATABASE_HOST not set, skipping GORM integration test")
	}
	dsn := "host=" + host +
		" port=" + orDefault(os.Getenv("DATABASE_PORT"), "5432") +
		" user=" + orDefault(os.Getenv("DATABASE_USER"), "weaveclip") +
		" password=" + os.Getenv("DATABASE_PASSWORD") +
		" dbname=" + orDefault(os.Getenv("DATABASE_DBNAME"), "weaveclip") +
		" sslmode=" + orDefault(os.Getenv("DATABASE_SSLMODE"), "disable")
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)
	return db
}

func mustSQLDB(t *testing.T, db *gorm.DB) *sql.DB {
	t.Helper()
	sqlDB, err := db.DB()
	require.NoError(t, err)
	return sqlDB
}

func gormTestEmail(t *testing.T) string {
	t.Helper()
	return fmt.Sprintf("gorm-it-%d@test.com", time.Now().UnixNano())
}

func orDefault(v, fallback string) string {
	if v == "" {
		return fallback
	}
	return v
}

func TestGormRepos_CRUD(t *testing.T) {
	db := openTestDB(t)
	// 幂等建表，保证独立于迁移引擎测试的执行顺序
	require.NoError(t, migrations.Up(mustSQLDB(t, db), "../migrations"))

	userRepo := repository.NewGormUserRepo(db)
	projectRepo := repository.NewGormProjectRepo(db)
	assetRepo := repository.NewGormAssetRepo(db)
	timelineRepo := repository.NewGormTimelineRepo(db)
	generationRepo := repository.NewGormGenerationRepo(db)
	renderRepo := repository.NewGormRenderRepo(db)
	taskRepo := repository.NewGormTaskResultRepo(db)
	editRepo := repository.NewGormEditRepo(db)

	// 用户
	user := &model.User{Email: gormTestEmail(t), PasswordHash: "x", Name: "GORM IT"}
	require.NoError(t, userRepo.Create(user))
	defer func() {
		// 清理尽力而为（用户表无级联）
		_ = db.Where("email = ?", user.Email).Delete(&model.User{}).Error
	}()

	// 项目
	project := &model.Project{UserID: user.ID, Name: "IT Project", Status: "draft"}
	require.NoError(t, projectRepo.Create(project))
	defer projectRepo.Delete(project.ID) //nolint:errcheck
	got, err := projectRepo.Get(project.ID)
	require.NoError(t, err)
	assert.Equal(t, "IT Project", got.Name)

	// 项目列表按属主过滤
	list, err := projectRepo.ListByUser(user.ID)
	require.NoError(t, err)
	assert.Len(t, list, 1)

	// 项目更新
	got.Name = "IT Project v2"
	require.NoError(t, projectRepo.Update(got))
	got2, _ := projectRepo.Get(project.ID)
	assert.Equal(t, "IT Project v2", got2.Name)

	// 素材：创建→更新→查询→删除
	asset := &model.Asset{ProjectID: project.ID, Type: "video", Status: "ready",
		StoragePath: "it/asset.mp4", FileName: "asset.mp4"}
	require.NoError(t, assetRepo.Create(asset))
	asset.Status = "uploading"
	require.NoError(t, assetRepo.Update(asset))
	assets, err := assetRepo.ListByProject(project.ID)
	require.NoError(t, err)
	assert.Len(t, assets, 1)
	assert.Equal(t, "uploading", assets[0].Status)

	// 时间线：两版本→最新→按版本
	for i := 0; i < 2; i++ {
		require.NoError(t, timelineRepo.Create(&model.Timeline{
			ProjectID: project.ID, Version: i + 1, TimelineJSON: []byte(`{"v":1}`), Label: "it",
		}))
	}
	versions, err := timelineRepo.ListVersions(project.ID)
	require.NoError(t, err)
	require.Len(t, versions, 2)
	assert.Equal(t, 2, versions[0].Version, "版本倒序返回")
	byVersion, err := timelineRepo.GetVersion(project.ID, 1)
	require.NoError(t, err)
	assert.Equal(t, 1, byVersion.Version)

	// 生成记录
	gen := &model.Generation{ProjectID: project.ID, Prompt: "it", Status: "processing"}
	require.NoError(t, generationRepo.Create(gen))
	gen.Status = "completed"
	require.NoError(t, generationRepo.Update(gen))
	genGot, err := generationRepo.Get(gen.ID)
	require.NoError(t, err)
	assert.Equal(t, "completed", genGot.Status)

	// 渲染记录
	render := &model.Render{ProjectID: project.ID, Format: "mp4", Status: "queued"}
	require.NoError(t, renderRepo.Create(render))
	render.Status = "completed"
	render.Progress = 100
	require.NoError(t, renderRepo.Update(render))
	renderGot, err := renderRepo.Get(render.ID)
	require.NoError(t, err)
	assert.Equal(t, 100, renderGot.Progress)

	// 任务轨迹：LatestByProject
	task := &model.TaskResult{TaskType: "analyze", ProjectID: project.ID, Status: "pending"}
	require.NoError(t, taskRepo.Create(task))
	task2 := &model.TaskResult{TaskType: "analyze", ProjectID: project.ID, Status: "completed"}
	require.NoError(t, taskRepo.Create(task2))
	latest, err := taskRepo.LatestByProject(project.ID, "analyze")
	require.NoError(t, err)
	assert.Equal(t, task2.ID, latest.ID)

	// 编辑记录
	require.NoError(t, editRepo.Create(&model.Edit{
		ProjectID: project.ID, Message: "it edit", Operation: []byte(`[]`),
	}))
	edits, err := editRepo.ListByProject(project.ID, 10)
	require.NoError(t, err)
	assert.Len(t, edits, 1)

	// 素材删除
	require.NoError(t, assetRepo.Delete(asset.ID))
	assets, err = assetRepo.ListByProject(project.ID)
	require.NoError(t, err)
	assert.Len(t, assets, 0)

	// 级联删除：删项目后素材/时间线应级联清除（FK ON DELETE CASCADE）
	require.NoError(t, assetRepo.Create(&model.Asset{ProjectID: project.ID, Type: "video",
		StoragePath: "it/cascade.mp4", FileName: "cascade.mp4"}))
	require.NoError(t, projectRepo.Delete(project.ID))
	var count int64
	require.NoError(t, db.Model(&model.Asset{}).Where("project_id = ?", project.ID).Count(&count).Error)
	assert.Equal(t, int64(0), count, "项目删除应级联删除素材")
}

func TestGormProjectRepo_NotFound(t *testing.T) {
	db := openTestDB(t)
	repo := repository.NewGormProjectRepo(db)
	_, err := repo.Get(999999999)
	assert.Error(t, err, "不存在的项目应返回错误")
}

// TestMigrationEngine_RoundTrip 迁移引擎 down→up 往返（独立于 CRUD 测试，最后执行还原现场）。
func TestMigrationEngine_RoundTrip(t *testing.T) {
	db := openTestDB(t)
	sqlDB := mustSQLDB(t, db)

	// 确保有已应用的迁移，再 down 全部（清理现场），最后 up 全部（还原）
	require.NoError(t, migrations.Up(sqlDB, "../migrations"))
	require.NoError(t, migrations.Down(sqlDB, "../migrations", ""))
	require.NoError(t, migrations.Up(sqlDB, "../migrations"))

	// 幂等：重复 up 不报错
	require.NoError(t, migrations.Up(sqlDB, "../migrations"))

	// 关键表存在
	for _, table := range []string{"users", "projects", "assets", "timelines", "generations", "edits", "renders", "task_results"} {
		var count int64
		require.NoError(t, db.Table(table).Count(&count).Error, "表 %s 应存在", table)
	}
}
