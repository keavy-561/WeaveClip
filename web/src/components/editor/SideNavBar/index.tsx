import React, { useState } from 'react';
import {
  IconVideoListStroked,
  IconMicrophone,
  IconAIWandLevel1,
  IconBulb,
  IconFont,
  IconHelpCircle,
} from '@douyinfe/semi-icons';
import styles from './index.module.scss';

interface SideNavBarProps {
  activeItem?: string;
}

const SideNavBar: React.FC<SideNavBarProps> = ({ activeItem: controlledActiveItem }) => {
  const [internalActive, setInternalActive] = useState<string>('ai-tools');
  const active = controlledActiveItem ?? internalActive;

  const navItems = [
    { key: 'media', icon: <IconVideoListStroked />, label: 'Media' },
    { key: 'record', icon: <IconMicrophone />, label: 'Record' },
    { key: 'content', icon: <IconAIWandLevel1 />, label: 'Content' },
    { key: 'ai-tools', icon: <IconBulb />, label: 'AI Tools' },
    { key: 'text', icon: <IconFont />, label: 'Text' },
    { key: 'brand', icon: <IconAIWandLevel1 />, label: 'Brand' },
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
        <button className={styles.navItem} title="Help">
          <span className={styles.icon}><IconHelpCircle /></span>
        </button>
        <div className={styles.avatar} title="User">
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
