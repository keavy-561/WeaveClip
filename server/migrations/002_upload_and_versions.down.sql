-- 002_upload_and_versions.down.sql
BEGIN;

DROP TABLE IF EXISTS task_results;
DROP INDEX IF EXISTS idx_assets_status;
ALTER TABLE assets DROP COLUMN IF EXISTS status;
DROP INDEX IF EXISTS idx_timelines_project_version;
-- 恢复单版本约束前需保证数据满足唯一性；多版本回滚场景由运维人工处理
CREATE UNIQUE INDEX IF NOT EXISTS idx_timelines_project_id_unique ON timelines(project_id);

COMMIT;
