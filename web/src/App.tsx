import React, { useState, useEffect } from 'react';
import Router from '@/router';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import ErrorBoundary from '@/components/error/ErrorBoundary';

const App: React.FC = () => {
  useAppTranslation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) {
    return <div style={{ padding: 24 }}>Loading...</div>;
  }

  return (
    <ErrorBoundary>
      <Router />
    </ErrorBoundary>
  );
};

export default App;
