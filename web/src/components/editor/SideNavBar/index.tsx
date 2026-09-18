import React from 'react';
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
import { useEditorUIStore, type EditorTool } from '@/stores/editorUIStore';
import styles from './index.module.scss';

interface NavItem {
  key: EditorTool;
  icon: React.ReactNode;
  label: string;
}

const SideNavBar: React.FC = () => {
  const activeTool = useEditorUIStore((s) => s.activeTool);
  const setActiveTool = useEditorUIStore((s) => s.setActiveTool);
  const { t } = useAppTranslation();

  const navItems: NavItem[] = [
    { key: 'media', icon: <IconVideoListStroked />, label: t('nav.media') },
    { key: 'record', icon: <IconMicrophone />, label: t('nav.record') },
    { key: 'content', icon: <IconAIWandLevel1 />, label: t('nav.content') },
    { key: 'ai', icon: <IconBulb />, label: t('nav.aiTools') },
    { key: 'text', icon: <IconFont />, label: t('nav.text') },
    { key: 'brand', icon: <IconAIWandLevel1 />, label: t('nav.brand') },
  ];

  // 点击已选中的工具时切回 media 面板
  const handleSelect = (key: EditorTool) => {
    setActiveTool(activeTool === key ? 'media' : key);
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.navItems}>
        {navItems.map((item) => (
          <Button
            key={item.key}
            theme="borderless"
            className={`${styles.navItem} ${activeTool === item.key ? styles.active : ''}`}
            aria-label={item.label}
            aria-pressed={activeTool === item.key}
            onClick={() => handleSelect(item.key)}
          >
            <span className={styles.icon}>{item.icon}</span>
            <span className={styles.label}>{item.label}</span>
          </Button>
        ))}
      </div>

      <div className={styles.bottomItems}>
        <Button
          theme="borderless"
          className={`${styles.navItem} ${activeTool === 'help' ? styles.active : ''}`}
          aria-label={t('common.help')}
          aria-pressed={activeTool === 'help'}
          icon={<IconHelpCircle />}
          onClick={() => handleSelect('help')}
        />
        <Avatar size="small" className={styles.avatar} alt={t('common.user')}>
          {t('home.ownerMe').charAt(0)}
        </Avatar>
      </div>
    </aside>
  );
};

export default SideNavBar;
