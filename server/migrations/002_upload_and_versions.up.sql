-- 002_upload_and_versions.up.sql
-- 工单 B06（素材上传状态）/ B09（时间轴多版本化）/ B15（异步任务轨迹）
BEGIN;

-- timelines 按 development-plan §8.1（D3 裁定）改为多版本设计：
-- 去掉单版本 UNIQUE 约束，改为 (project_id, version DESC) 索引
ALTER TABLE timelines DROP CONSTRAINT IF EXISTS timelines_project_id_key;

DROP INDEX IF EXISTS idx_timelines_project_id;
CREATE INDEX IF NOT EXISTS idx_timelines_project_version ON timelines(project_id, version DESC);

-- 素材上传状态：presign 后为 uploading，confirm 后为 ready
ALTER TABLE assets ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'ready';
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);

-- 异步任务轨迹（development-plan §8.1 task_results，B14/B15 使用）
CREATE TABLE IF NOT EXISTS task_results (
    id BIGSERIAL PRIMARY KEY,
    task_type VARCHAR(64) NOT NULL,
    task_id VARCHAR(128) UNIQUE,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    progress INTEGER NOT NULL DEFAULT 0,
    result JSONB,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_results_task_id ON task_results(task_id);
CREATE INDEX IF NOT EXISTS idx_task_results_project_id ON task_results(project_id);

COMMIT;
