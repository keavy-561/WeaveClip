import React, { useEffect } from 'react';
import { useThemeStore } from '@/stores/themeStore';
import router from '@/router';

const App: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return router;
};

export default App;
