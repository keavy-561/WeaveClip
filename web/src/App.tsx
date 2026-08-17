import React, { useEffect } from 'react';
import { useThemeStore } from '@/stores/themeStore';
import Router from '@/router';

const App: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return <Router />;
};

export default App;
