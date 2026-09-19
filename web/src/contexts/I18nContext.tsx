import React, { createContext, useContext, useEffect, useState } from 'react';
import i18n from '@/locales/i18n';

interface I18nContextValue {
  t: typeof i18n.t;
  i18n: typeof i18n;
  language: string;
  changeLanguage: (...args: Parameters<typeof i18n.changeLanguage>) => ReturnType<typeof i18n.changeLanguage>;
}

const I18nContext = createContext<I18nContextValue | null>(null);

interface I18nProviderProps {
  children: React.ReactNode;
}

const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  // 订阅语言切换事件并触发重渲染，否则 changeLanguage 后 t() 不更新（走查 P0-7 根因）
  const [language, setLanguage] = useState(i18n.language);
  useEffect(() => {
    const onLanguageChanged = (lng: string) => setLanguage(lng);
    i18n.on('languageChanged', onLanguageChanged);
    return () => {
      i18n.off('languageChanged', onLanguageChanged);
    };
  }, []);

  return (
    <I18nContext.Provider
      value={{
        t: i18n.t.bind(i18n),
        i18n,
        language,
        changeLanguage: i18n.changeLanguage.bind(i18n),
      }}
    >
      {children}
    </I18nContext.Provider>
  );
};

const useI18n = (): I18nContextValue => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
};

export { I18nProvider, useI18n };
