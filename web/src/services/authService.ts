import api from './api';

export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export const authService = {
  async register(email: string, password: string, name?: string): Promise<User> {
    const { data } = await api.post<{ user: User }>('/auth/register', { email, password, name });
    return data.user;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
    return data;
  },
};
