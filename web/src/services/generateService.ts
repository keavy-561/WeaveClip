import api from './api';
import type { GenerateRequest, GenerateResponse, ChatRequest, ChatResponse } from '@/types/ai';

export const generateService = {
  /** POST /api/projects/:id/generate */
  start: async (projectId: string, payload: GenerateRequest): Promise<GenerateResponse> => {
    const { data } = await api.post<GenerateResponse>(`/projects/${projectId}/generate`, payload);
    return data;
  },

  /** GET /api/generations/:id */
  status: async (generationId: string): Promise<GenerateResponse> => {
    const { data } = await api.get<GenerateResponse>(`/generations/${generationId}`);
    return data;
  },
};

export const chatService = {
  /** POST /api/projects/:id/chat */
  send: async (projectId: string, payload: ChatRequest): Promise<ChatResponse> => {
    const { data } = await api.post<ChatResponse>(`/projects/${projectId}/chat`, payload);
    return data;
  },
};

export const renderService = {
  /** POST /api/projects/:id/render */
  start: async (projectId: string, payload: { format: string; resolution: string; fps: number }) => {
    const { data } = await api.post(`/projects/${projectId}/render`, payload);
    return data;
  },

  /** GET /api/renders/:id */
  status: async (renderId: string) => {
    const { data } = await api.get(`/renders/${renderId}`);
    return data;
  },
};
