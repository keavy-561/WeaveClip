import React from 'react';
import Router from '@/router';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import ErrorBoundary from '@/components/error/ErrorBoundary';

// i18n 初始化是同步的，无需 ready 门控（避免首帧闪烁与硬编码 Loading 文案，WO5-12）
const App: React.FC = () => {
  useAppTranslation();

  return (
    <ErrorBoundary>
      <Router />
    </ErrorBoundary>
  );
};

export default App;
