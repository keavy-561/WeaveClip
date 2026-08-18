import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import zh from './zh.json';
import en from './en.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      zh,
      en,
    },
    lng: 'zh',
    fallbackLng: 'zh',
    interpolation: {
      escapeValue: false,
    },
  });

console.log('[i18n] initialized', {
  isInitialized: i18n.isInitialized,
  language: i18n.language,
  resourceKeys: Object.keys(i18n.store.data.zh || {}),
  hasHomeHeroTitle: !!i18n.store.data.zh?.home?.heroTitle,
});

export default i18n;
