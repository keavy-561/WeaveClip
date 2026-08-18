import React, { useState } from 'react';
import {
  IconVideoListStroked,
  IconMicrophone,
  IconAIWandLevel1,
  IconBulb,
  IconFont,
  IconHelpCircle,
} from '@douyinfe/semi-icons';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import styles from './index.module.scss';

interface SideNavBarProps {
  activeItem?: string;
}

const SideNavBar: React.FC<SideNavBarProps> = ({ activeItem: controlledActiveItem }) => {
  const [internalActive, setInternalActive] = useState<string>('ai-tools');
  const active = controlledActiveItem ?? internalActive;
  const { t } = useAppTranslation();

  const navItems = [
    { key: 'media', icon: <IconVideoListStroked />, label: t('nav.media') },
    { key: 'record', icon: <IconMicrophone />, label: t('nav.record') },
    { key: 'content', icon: <IconAIWandLevel1 />, label: t('nav.content') },
    { key: 'ai-tools', icon: <IconBulb />, label: t('nav.aiTools') },
    { key: 'text', icon: <IconFont />, label: t('nav.text') },
    { key: 'brand', icon: <IconAIWandLevel1 />, label: t('nav.brand') },
  ];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.navItems}>
        {navItems.map((item) => (
          <button
            key={item.key}
            className={`${styles.navItem} ${active === item.key ? styles.active : ''}`}
            title={item.label}
            onClick={() => setInternalActive(item.key)}
          >
            <span className={styles.icon}>{item.icon}</span>
            <span className={styles.label}>{item.label}</span>
          </button>
        ))}
      </div>

      <div className={styles.bottomItems}>
        <button className={styles.navItem} title={t('common.help')}>
          <span className={styles.icon}><IconHelpCircle /></span>
        </button>
        <div className={styles.avatar} title={t('common.user')}>
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuC6SbRvBK7utPQvzhZjbwhsiLfLZ5afT8fCm2YA_xflsK48xTlPbHK3h_zjVV4s_0MjLlgBGpNRrRdJxKgEYFHqHhgOHDmh9MXDDyakOnlrhUu1xtHCF1KNxzH8j1gZWcYbKOGNQY9ZMUO-3tGf7_DRSwhLVu83WwD-jM9Ec8kd2LSqiift0jArE5kjHB7nkFjwZu3eoaQ9oN0RIY0BPkT_r8fX1e1tK0Z3q6CxJ4O4bLhXEB7OauXKMA"
            alt="User avatar"
          />
        </div>
      </div>
    </aside>
  );
};

export default SideNavBar;
