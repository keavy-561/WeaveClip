import React from 'react';
import { Nav, Progress, Button, Toast } from '@douyinfe/semi-ui';
import { IconFolder, IconCloud, IconUserGroup, IconDelete } from '@douyinfe/semi-icons';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import styles from './index.module.scss';

export type ProjectFilter = 'all' | 'cloud' | 'team' | 'trash';

interface SidebarNavProps {
  active: ProjectFilter;
  onSelect: (filter: ProjectFilter) => void;
  /** 存储空间用量（GB） */
  usedGB: number;
  totalGB: number;
}

const SidebarNav: React.FC<SidebarNavProps> = ({ active, onSelect, usedGB, totalGB }) => {
  const { t } = useAppTranslation();
  const percent = Math.min(100, Math.round((usedGB / totalGB) * 100));

  const menus: Array<{ itemKey: ProjectFilter; text: string; icon: React.ReactNode }> = [
    { itemKey: 'all', text: t('home.allProjects'), icon: <IconFolder /> },
    { itemKey: 'cloud', text: t('home.myCloud'), icon: <IconCloud /> },
    { itemKey: 'team', text: t('home.teamWorkspaces'), icon: <IconUserGroup /> },
    { itemKey: 'trash', text: t('home.trash'), icon: <IconDelete /> },
  ];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.card}>
        <Nav
          className={styles.menu}
          selectedKeys={[active]}
          onSelect={(e) => onSelect(e.itemKey as ProjectFilter)}
          items={menus}
        />
        <div className={styles.storage}>
          <div className={styles.storageLabel}>{t('home.storageTitle')}</div>
          <Progress
            percent={percent}
            showInfo={false}
            aria-label={t('home.storageUsage', { used: usedGB, total: totalGB })}
            className={styles.storageBar}
          />
          <div className={styles.storageText}>
            {t('home.storageUsage', { used: usedGB, total: totalGB })}
          </div>
          <Button
            theme="borderless"
            size="small"
            className={styles.upgrade}
            onClick={() => Toast.info(t('home.upgradeSoon'))}
          >
            {t('home.upgradePlan')}
          </Button>
        </div>
      </div>
    </aside>
  );
};

export default SidebarNav;