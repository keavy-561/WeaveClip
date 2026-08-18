import React, { useState, useEffect } from 'react';
import { useThemeStore } from '@/stores/themeStore';
import Router from '@/router';
import { useAppTranslation } from '@/hooks/useAppTranslation';

const App: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);
  useAppTranslation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  if (!ready) {
    return <div style={{ padding: 24 }}>Loading...</div>;
  }

  return <Router />;
};

export default App;
