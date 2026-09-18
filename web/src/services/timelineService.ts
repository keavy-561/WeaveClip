import api from './api';

export interface TimelineVersion {
  id: number;
  projectId: number;
  version: number;
  timelineJson: unknown;
  label?: string;
  createdAt: string;
  updatedAt: string;
}

export const timelineService = {
  /** GET /api/projects/:id/timeline —— 默认最新版本 */
  get: async (projectId: string): Promise<TimelineVersion | null> => {
    try {
      const { data } = await api.get<{ timeline: TimelineVersion }>(`/projects/${projectId}/timeline`);
      return data.timeline;
    } catch (error) {
      const status = (error as { response?: { status?: number } }).response?.status;
      if (status === 404) {
        // 项目还没有时间线（未生成、未编辑过）
        return null;
      }
      throw error;
    }
  },

  /** GET /api/projects/:id/timeline?version=N */
  getVersion: async (projectId: string, version: number): Promise<TimelineVersion> => {
    const { data } = await api.get<{ timeline: TimelineVersion }>(
      `/projects/${projectId}/timeline`,
      { params: { version } }
    );
    return data.timeline;
  },

  /** GET /api/projects/:id/timeline/versions（Phase 6 Version History） */
  versions: async (projectId: string): Promise<TimelineVersion[]> => {
    const { data } = await api.get<{ versions: TimelineVersion[] }>(
      `/projects/${projectId}/timeline/versions`
    );
    return data.versions ?? [];
  },

  /** PUT /api/projects/:id/timeline —— 保存为新版本 */
  save: async (projectId: string, dsl: unknown, label?: string): Promise<TimelineVersion> => {
    const { data } = await api.put<{ timeline: TimelineVersion }>(
      `/projects/${projectId}/timeline`,
      dsl,
      { headers: label ? { 'X-Timeline-Label': label } : undefined }
    );
    return data.timeline;
  },
};
