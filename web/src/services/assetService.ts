import api from './api';
import type { Asset } from '@/types/asset';
import type { AnalyzeStatus } from '@/types/api';

export const assetService = {
  /** GET /api/projects/:id/assets */
  list: async (projectId: string): Promise<Asset[]> => {
    const { data } = await api.get<{ assets: Asset[] }>(`/projects/${projectId}/assets`);
    return data.assets ?? [];
  },

  /** DELETE /api/assets/:id */
  remove: async (assetId: string): Promise<void> => {
    await api.delete(`/assets/${assetId}`);
  },
};

export const analyzeService = {
  /** POST /api/projects/:id/analyze */
  start: async (projectId: string, assetIds: string[]): Promise<{ analysisId: string; status: string }> => {
    const { data } = await api.post(`/projects/${projectId}/analyze`, { assetIds });
    return data;
  },

  /** GET /api/projects/:id/analysis */
  status: async (projectId: string): Promise<AnalyzeStatus> => {
    const { data } = await api.get<AnalyzeStatus>(`/projects/${projectId}/analysis`);
    return data;
  },
};
