import React, { useState } from 'react';
import {
  IconFilter,
  IconSetting,
  IconAIWandLevel1,
  IconLoopTextStroked,
  IconFastForward,
} from '@douyinfe/semi-icons';
import styles from './index.module.scss';

const ToolSidebar: React.FC = () => {
  const [active, setActive] = useState<string>('adjustments');
  const tools = [
    { key: 'filters', icon: <IconFilter />, title: 'Filters' },
    { key: 'adjustments', icon: <IconSetting />, title: 'Adjustments' },
    { key: 'effects', icon: <IconAIWandLevel1 />, title: 'Effects' },
    { key: 'captions', icon: <IconLoopTextStroked />, title: 'Captions' },
    { key: 'speed', icon: <IconFastForward />, title: 'Speed' },
  ];

  return (
    <div className={styles.toolbar}>
      {tools.map((tool) => (
        <button
          key={tool.key}
          className={`${styles.toolBtn} ${active === tool.key ? styles.active : ''}`}
          title={tool.title}
          onClick={() => setActive(tool.key)}
        >
          <span className={styles.toolIcon}>{tool.icon}</span>
        </button>
      ))}
    </div>
  );
};

export default ToolSidebar;
