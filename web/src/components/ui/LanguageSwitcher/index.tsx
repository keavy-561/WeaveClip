import React from 'react';
import { Dropdown } from '@douyinfe/semi-ui';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import styles from './index.module.scss';

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useAppTranslation();

  const handleChange = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  const menu = [
    { node: 'item' as const, name: '中文', onClick: () => handleChange('zh'), active: i18n.language === 'zh' },
    { node: 'item' as const, name: 'English', onClick: () => handleChange('en'), active: i18n.language === 'en' },
  ];

  return (
    <Dropdown trigger="click" position="bottomRight" menu={menu}>
      <button className={styles.trigger}>
        {i18n.language === 'zh' ? '中' : 'EN'}
      </button>
    </Dropdown>
  );
};

export default LanguageSwitcher;
