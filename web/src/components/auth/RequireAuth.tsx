import React from 'react';
import { Navigate } from 'react-router-dom';

interface Props {
  children: React.ReactNode;
}

const RequireAuth: React.FC<Props> = ({ children }) => {
  const mode = import.meta.env.VITE_API_MODE;
  if (mode === 'mock') {
    return <>{children}</>;
  }
  const token = localStorage.getItem('weaveclip-token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export default RequireAuth;
