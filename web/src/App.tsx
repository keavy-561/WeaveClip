import React, { useState, useEffect } from 'react';
import { useThemeStore } from '@/stores/themeStore';
import Router from '@/router';
import { useTranslation } from 'react-i18next';

const App: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);
  const { t, i18n } = useTranslation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (i18n.isInitialized) {
      setReady(true);
    } else {
      const handler = () => setReady(true);
      i18n.on('initialized', handler);
      return () => i18n.off('initialized', handler);
    }
  }, [i18n]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  if (!ready) {
    return <div style={{ padding: 24 }}>{t('common.loading', 'Loading...')}</div>;
  }

  return <Router />;
};

export default App;
