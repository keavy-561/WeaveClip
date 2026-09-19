import api from './api';
import type { Asset } from '@/types/asset';
import type { AnalyzeStatus } from '@/types/api';

export const assetService = {
  /** GET /api/projects/:id/assets */
  list: async (projectId: string): Promise<Asset[]> => {
    const { data } = await api.get<{ assets: Asset[] }>(`/projects/${projectId}/assets`);
    return data.assets ?? [];
  },

  /** POST /api/projects/:id/assets/presign —— 获取直传 URL（工单 B06 契约） */
  presign: async (
    projectId: string,
    payload: { type: string; fileName: string; fileSize: number }
  ): Promise<{ uploadUrl: string; assetId: string }> => {
    const { data } = await api.post<{ uploadUrl: string; assetId: string }>(
      `/projects/${projectId}/assets/presign`,
      payload
    );
    return data;
  },

  /** PUT 直传文件到预签名 URL（onProgress 上报 0-100） */
  uploadToPresigned: async (
    uploadUrl: string,
    file: File,
    contentType: string,
    onProgress?: (pct: number) => void
  ): Promise<void> => {
    await api.put(uploadUrl, file, {
      headers: { 'Content-Type': contentType },
      // 预签名 URL 不带鉴权头
      transformRequest: [(data) => data],
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      },
    });
  },

  /** POST /api/projects/:id/assets/confirm —— 确认上传完成并触发处理管线 */
  confirm: async (projectId: string, assetId: string): Promise<Asset> => {
    const { data } = await api.post<{ asset: Asset }>(`/projects/${projectId}/assets/confirm`, {
      assetId,
    });
    return data.asset;
  },

  /** DELETE /api/assets/:id */
  remove: async (assetId: string): Promise<void> => {
    await api.delete(`/assets/${assetId}`);
  },
};

export const analyzeService = {
  /** POST /api/projects/:id/analyze */
  start: async (projectId: string, assetIds: number[] = []): Promise<{ analysisId: string; status: string }> => {
    const { data } = await api.post(`/projects/${projectId}/analyze`, { assetIds });
    return data;
  },

  /** GET /api/projects/:id/analysis */
  status: async (projectId: string): Promise<AnalyzeStatus> => {
    const { data } = await api.get<AnalyzeStatus>(`/projects/${projectId}/analysis`);
    return data;
  },
};
