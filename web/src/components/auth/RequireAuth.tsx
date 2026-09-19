import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { authService } from '@/services/authService';

interface Props {
  children: React.ReactNode;
}

/** 验证结果缓存时长：登录态校验通过后 5 分钟内不再重复请求 /auth/me */
const ME_STALE_TIME = 5 * 60 * 1000;

const RequireAuth: React.FC<Props> = ({ children }) => {
  const mode = import.meta.env.VITE_API_MODE;
  const isMockMode = mode === 'mock';
  const token = isMockMode ? null : localStorage.getItem('weaveclip-token');

  // 真实模式有 token 时调 GET /auth/me 验证有效性（工单 WO2-07）。
  // 结果存入全局查询缓存（key: ['auth','me']），多个受保护路由共享一次验证；
  // enabled 只在「真实模式且有 token」时触发，配合缓存不会无限重渲染。
  const { isLoading, isError } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authService.me(),
    enabled: !isMockMode && !!token,
    retry: false,
    staleTime: ME_STALE_TIME,
  });

  // 验证失败（含 401）：清除失效 token，交由下方重定向到登录页
  useEffect(() => {
    if (isError) {
      localStorage.removeItem('weaveclip-token');
    }
  }, [isError]);

  if (isMockMode) {
    return <>{children}</>;
  }

  if (!token || isError) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    // 验证期间渲染 null，避免子页面带着未验证状态闪现
    return null;
  }

  return <>{children}</>;
};

export default RequireAuth;
