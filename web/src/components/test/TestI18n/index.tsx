import React from 'react';
import i18n from '@/locales/i18n';

const TestI18n: React.FC = () => {
  const direct = i18n.t('home.heroTitle');
  const withDefault = i18n.t('home.heroTitle', '默认值');
  const nested = (i18n.store.data.zh as any)?.home?.heroTitle;
  const pathExists = !!nested;
  
  return (
    <div style={{ padding: 24 }}>
      <p>Path exists: {pathExists ? 'true' : 'false'}</p>
      <p>Nested value: {nested}</p>
      <p>i18n.t: {direct}</p>
      <p>i18n.t with default: {withDefault}</p>
    </div>
  );
};

export default TestI18n;
