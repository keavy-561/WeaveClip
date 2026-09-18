import React, { useState } from 'react';
import { Button } from '@douyinfe/semi-ui';
import {
  IconFilter,
  IconSetting,
  IconAIWandLevel1,
  IconLoopTextStroked,
  IconFastForward,
} from '@douyinfe/semi-icons';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import styles from './index.module.scss';

const ToolSidebar: React.FC = () => {
  const [active, setActive] = useState<string>('adjustments');
  const { t } = useAppTranslation();
  const tools = [
    { key: 'filters', icon: <IconFilter />, title: t('editor.sidebar.filters') },
    { key: 'adjustments', icon: <IconSetting />, title: t('editor.sidebar.adjustments') },
    { key: 'effects', icon: <IconAIWandLevel1 />, title: t('editor.sidebar.effects') },
    { key: 'captions', icon: <IconLoopTextStroked />, title: t('editor.sidebar.captions') },
    { key: 'speed', icon: <IconFastForward />, title: t('editor.sidebar.speed') },
  ];

  return (
    <div className={styles.toolbar}>
      {tools.map((tool) => (
        <Button
          key={tool.key}
          theme="borderless"
          className={`${styles.toolBtn} ${active === tool.key ? styles.active : ''}`}
          title={tool.title}
          aria-label={tool.title}
          onClick={() => setActive(tool.key)}
        >
          <span className={styles.toolIcon}>{tool.icon}</span>
        </Button>
      ))}
    </div>
  );
};

export default ToolSidebar;