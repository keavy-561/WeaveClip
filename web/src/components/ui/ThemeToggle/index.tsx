import React from 'react';
import { Button } from '@douyinfe/semi-ui';
import { IconSun, IconMoon } from '@douyinfe/semi-icons';
import { useThemeStore } from '@/stores/themeStore';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import styles from './index.module.scss';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useThemeStore();
  const { t } = useAppTranslation();

  return (
    <Button
      icon={theme === 'dark' ? <IconSun /> : <IconMoon />}
      theme="borderless"
      size="small"
      onClick={toggleTheme}
      className={styles.toggle}
      aria-label={theme === 'dark' ? t('theme.darkLabel') : t('theme.lightLabel')}
    />
  );
};

export default ThemeToggle;
