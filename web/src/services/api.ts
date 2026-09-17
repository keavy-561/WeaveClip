import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('weaveclip-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 认证端点自身的 401（如登录密码错误）留给页面显示错误提示；
    // 仅当访问受保护资源时 token 失效才踢回登录页
    const isAuthRequest = error.config?.url?.includes('/auth/');
    if (error.response?.status === 401 && !isAuthRequest) {
      localStorage.removeItem('weaveclip-token');
      window.location.replace('/login');
    }
    // 透传后端错误消息（后端错误响应体 { code, message, request_id }），
    // 避免上层拿到 axios 默认的 "Request failed with status code 400"
    const backendMessage = error.response?.data?.message;
    if (typeof backendMessage === 'string' && backendMessage) {
      error.message = backendMessage;
    }
    return Promise.reject(error);
  }
);

export default api;
