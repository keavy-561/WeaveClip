import React from 'react';
import i18n from '@/locales/i18n';

const TestI18n: React.FC = () => {
  const direct = i18n.t('home.heroTitle');
  const storeValue = (i18n.store.data.zh as any)?.home?.heroTitle;
  const exists = i18n.exists('home.heroTitle');
  const language = i18n.language;
  const resolvedLanguage = i18n.resolvedLanguage;
  const isInitialized = i18n.isInitialized;
  const storeKeys = (i18n.store.data.zh as any) ? Object.keys(i18n.store.data.zh as any) : [];
  
  return (
    <div style={{ padding: 24 }}>
      <p>i18n.isInitialized: {isInitialized ? 'true' : 'false'}</p>
      <p>i18n.language: {language}</p>
      <p>i18n.resolvedLanguage: {resolvedLanguage}</p>
      <p>i18n.exists('home.heroTitle'): {exists ? 'true' : 'false'}</p>
      <p>store.data.zh keys: {storeKeys.join(', ')}</p>
      <p>store.data.zh.home.heroTitle: {storeValue}</p>
      <p>Direct i18n.t: {direct}</p>
      <p>Expected: 对着你的素材说话。</p>
    </div>
  );
};

export default TestI18n;
