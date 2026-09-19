import React from 'react';
import { Button } from '@douyinfe/semi-ui';
import {
  IconFilter,
  IconSetting,
  IconAIWandLevel1,
  IconLoopTextStroked,
  IconFastForward,
} from '@douyinfe/semi-icons';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { useEditorUIStore, type InspectorTab } from '@/stores/editorUIStore';
import styles from './index.module.scss';

interface SideTool {
  key: InspectorTab;
  icon: React.ReactNode;
  title: string;
}

const ToolSidebar: React.FC = () => {
  const activeTab = useEditorUIStore((s) => s.activeInspectorTab);
  const setInspectorTab = useEditorUIStore((s) => s.setInspectorTab);
  const { t } = useAppTranslation();

  // 快捷按钮与右侧检查器的 tab 一一对应，点击即切换检查器面板
  const tools: SideTool[] = [
    { key: 'color', icon: <IconFilter />, title: t('editor.inspector.adjustColors') },
    { key: 'filter', icon: <IconSetting />, title: t('editor.inspector.filters') },
    { key: 'effect', icon: <IconAIWandLevel1 />, title: t('editor.sidebar.effects') },
    { key: 'caption', icon: <IconLoopTextStroked />, title: t('editor.sidebar.captions') },
    { key: 'speed', icon: <IconFastForward />, title: t('editor.sidebar.speed') },
  ];

  return (
    <div className={styles.toolbar}>
      {tools.map((tool) => (
        <Button
          key={tool.key}
          theme="borderless"
          className={`${styles.toolBtn} ${activeTab === tool.key ? styles.active : ''}`}
          title={tool.title}
          aria-label={tool.title}
          aria-pressed={activeTab === tool.key}
          onClick={() => setInspectorTab(tool.key)}
        >
          <span className={styles.toolIcon}>{tool.icon}</span>
        </Button>
      ))}
    </div>
  );
};

export default ToolSidebar;
