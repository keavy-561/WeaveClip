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

const isMockMode = import.meta.env.VITE_API_MODE === 'mock';

export const mockAccount = {
  email: 'demo@weaveclip.dev',
  password: 'demo1234',
  user: {
    id: 'user_demo_1',
    email: 'demo@weaveclip.dev',
    name: 'Demo',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  } as User,
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const authService = {
  async register(email: string, password: string, name?: string): Promise<User> {
    if (isMockMode) {
      await delay(300);
      return { ...mockAccount.user, email, name: name || mockAccount.user.name };
    }
    const { data } = await api.post<{ user: User }>('/auth/register', { email, password, name });
    return data.user;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    if (isMockMode) {
      await delay(300);
      if (email === mockAccount.email && password === mockAccount.password) {
        return { token: 'mock-token-demo', user: mockAccount.user };
      }
      throw new Error('Invalid email or password');
    }
    const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
    return data;
  },
};