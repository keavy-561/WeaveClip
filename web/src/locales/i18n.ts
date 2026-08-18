import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import zh from './zh.json';
import en from './en.json';

console.log('[i18n] zh loaded:', !!zh, 'en loaded:', !!en);

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
  })
  .then(() => {
    console.log('[i18n] initialized, language:', i18n.language);
    console.log('[i18n] home.heroTitle =', i18n.t('home.heroTitle'));
  })
  .catch((err) => {
    console.error('[i18n] init failed', err);
  });

export default i18n;
