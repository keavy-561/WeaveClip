import axios from 'axios';
import api from './api';
import type { Asset } from '@/types/asset';
import type { AnalyzeStatus } from '@/types/api';

// 预签名直传专用客户端：不带业务后端的 baseURL 与请求/响应拦截器。
// 共用实例的拦截器会附加 Authorization 头，与预签名 URL 构成双重鉴权，
// MinIO 直接以 400 "multiple authentication types" 拒绝（mock 模式走同源
// 回环端点时不暴露，真实模式切 MinIO 后必现）。
// 超时放宽到 5 分钟：视频文件直传耗时可能超过业务接口的 30s 预算。
const presignClient = axios.create({ timeout: 300000 });

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
    // 预签名 URL 自带鉴权查询参数，请求不得再带 Authorization 头
    await presignClient.put(uploadUrl, file, {
      headers: { 'Content-Type': contentType },
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
