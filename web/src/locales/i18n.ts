import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import zh from './zh.json';
import en from './en.json';

export const initI18n = async () => {
  await i18n
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
};

export default i18n;
