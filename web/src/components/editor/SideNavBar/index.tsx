import React, { useState } from 'react';
import {
  Avatar,
  Button,
} from '@douyinfe/semi-ui';
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
          <Button
            key={item.key}
            theme="borderless"
            className={`${styles.navItem} ${active === item.key ? styles.active : ''}`}
            aria-label={item.label}
            onClick={() => setInternalActive(item.key)}
          >
            <span className={styles.icon}>{item.icon}</span>
            <span className={styles.label}>{item.label}</span>
          </Button>
        ))}
      </div>

      <div className={styles.bottomItems}>
        <Button
          theme="borderless"
          className={styles.navItem}
          aria-label={t('common.help')}
          icon={<IconHelpCircle />}
        />
<Avatar size="small" className={styles.avatar} alt={t('common.user')}>
          {t('home.ownerMe').charAt(0)}
        </Avatar>
      </div>
    </aside>
  );
};

export default SideNavBar;