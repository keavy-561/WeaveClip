import React from 'react';
import { Button, Icon } from '@douyinfe/semi-ui';
import { IconMoon, IconSun } from '@douyinfe/semi-icons';
import { useThemeStore } from '@/stores/themeStore';
import styles from './index.module.scss';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <Button
      icon={<Icon icon={theme === 'dark' ? IconSun : IconMoon} />}
      theme="borderless"
      size="small"
      onClick={toggleTheme}
      className={styles.toggle}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
    />
  );
};

export default ThemeToggle;
