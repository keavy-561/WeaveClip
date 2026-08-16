import api from './api';
import type { Project } from '@/types/project';

export interface ProjectListResponse {
  projects: Project[];
}

export const projectService = {
  /** GET /api/projects */
  list: async (): Promise<Project[]> => {
    const { data } = await api.get<ProjectListResponse>('/projects');
    return data.projects ?? [];
  },

  /** POST /api/projects */
  create: async (payload: { name: string; duration?: number; aspectRatio?: string; style?: string }): Promise<Project> => {
    const { data } = await api.post<{ project: Project }>('/projects', payload);
    return data.project;
  },

  /** GET /api/projects/:id */
  get: async (id: string): Promise<Project> => {
    const { data } = await api.get<{ project: Project }>(`/projects/${id}`);
    return data.project;
  },

  /** DELETE /api/projects/:id */
  remove: async (id: string): Promise<void> => {
    await api.delete(`/projects/${id}`);
  },
};
