import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@douyinfe/semi-ui';
import { IconArrowLeft, IconExport } from '@douyinfe/semi-icons';
import Logo from '@/components/ui/Logo';
import ThemeToggle from '@/components/ui/ThemeToggle';
import AssetPanel from '@/components/editor/Assets/AssetPanel';
import VideoPlayer from '@/components/editor/VideoPlayer';
import Timeline from '@/components/editor/Timeline';
import AIChat from '@/components/editor/AIChat';
import { useProjectStore } from '@/stores/projectStore';
import { useTimelineStore } from '@/stores/timelineStore';
import { useAIChatStore } from '@/stores/aiChatStore';
import { mockProjects, mockAssets, mockTimelineDSL, mockChatMessages } from '@/utils/mockData';
import styles from './index.module.scss';

const Editor: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const setCurrentProject = useProjectStore((s) => s.setCurrentProject);
  const setDSL = useTimelineStore((s) => s.setDSL);
  const addMessage = useAIChatStore((s) => s.addMessage);
  const clearMessages = useAIChatStore((s) => s.clearMessages);

  // Phase 0: 加载 Mock 数据
  useEffect(() => {
    const project =
      mockProjects.find((p) => p.id === projectId) ??
      ({
        id: projectId ?? 'proj_new',
        name: 'Untitled Video',
        status: 'draft',
        duration: 45,
        aspectRatio: '9:16',
        style: 'energetic',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as const);

    setCurrentProject({ ...project });
    setDSL(mockTimelineDSL);

    clearMessages();
    mockChatMessages.forEach((m) => addMessage(m));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const project = useProjectStore((s) => s.currentProject);
  const projectAssets = mockAssets.filter(
    (a) => a.projectId === (projectId === 'proj_new' ? 'proj_1' : projectId)
  );

  return (
    <div className={styles.page}>
      {/* 顶部栏 */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Button
            icon={<IconArrowLeft />}
            theme="borderless"
            size="small"
            onClick={() => navigate('/projects')}
            style={{ color: 'var(--semi-color-text-1)' }}
          />
          <Logo size="small" />
        </div>
        <div className={styles.headerCenter}>
          <span className={styles.projectName}>{project?.name ?? 'Untitled Video'}</span>
        </div>
        <div className={styles.headerRight}>
          <ThemeToggle />
          <Button
            theme="solid"
            size="small"
            icon={<IconExport />}
            className={styles.exportBtn}
          >
            Export
          </Button>
        </div>
      </header>

      {/* 三栏主体 */}
      <div className={styles.body}>
        {/* 左栏：Assets */}
        <aside className={styles.assetsPane}>
          <AssetPanel assets={projectAssets.length > 0 ? projectAssets : mockAssets} />
        </aside>

        {/* 中栏：Preview + Timeline */}
        <main className={styles.centerPane}>
          <div className={styles.previewArea}>
            <VideoPlayer />
          </div>
          <div className={styles.timelineArea}>
            <Timeline />
          </div>
        </main>

        {/* 右栏：AI Chat */}
        <aside className={styles.chatPane}>
          <AIChat />
        </aside>
      </div>
    </div>
  );
};

export default Editor;
