import React from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@douyinfe/semi-ui';
import {
  IconUndo,
  IconRedo,
  IconSetting,
  IconShare,
  IconDownload,
} from '@douyinfe/semi-icons';
import Logo from '@/components/ui/Logo';
import SideNavBar from '@/components/editor/SideNavBar';
import MediaPanel from '@/components/editor/MediaPanel';
import VideoPlayer from '@/components/editor/VideoPlayer';
import Timeline from '@/components/editor/Timeline';
import InspectorPanel from '@/components/editor/InspectorPanel';
import ToolSidebar from '@/components/editor/ToolSidebar';
import { useProjectStore } from '@/stores/projectStore';
import { useTimelineStore } from '@/stores/timelineStore';
import { useAIChatStore } from '@/stores/aiChatStore';
import { mockProjects, mockAssets, mockTimelineDSL, mockChatMessages } from '@/utils/mockData';
import styles from './index.module.scss';

const Editor: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();

  const setCurrentProject = useProjectStore((s) => s.setCurrentProject);
  const setDSL = useTimelineStore((s) => s.setDSL);
  const addMessage = useAIChatStore((s) => s.addMessage);
  const clearMessages = useAIChatStore((s) => s.clearMessages);

  React.useEffect(() => {
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

  const projectAssets = mockAssets.filter(
    (a) => a.projectId === (projectId === 'proj_new' ? 'proj_1' : projectId)
  );

  return (
    <div className={styles.page}>
      {/* 顶部栏 */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Logo size="small" />
        </div>
        <div className={styles.headerCenter}>
          <span className={styles.projectName}>
            16:9
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </span>
        </div>
        <div className={styles.headerRight}>
          <Button
            icon={<IconUndo />}
            theme="borderless"
            size="small"
            className={styles.iconBtn}
            aria-label="Undo"
          />
          <Button
            icon={<IconRedo />}
            theme="borderless"
            size="small"
            className={styles.iconBtn}
            aria-label="Redo"
          />
          <Button
            icon={<IconSetting />}
            theme="borderless"
            size="small"
            className={styles.iconBtn}
            aria-label="Settings"
          />
          <Button theme="borderless" size="small" className={styles.shareBtn}>
            <IconShare />
            Share
          </Button>
          <Button icon={<IconDownload />} theme="solid" size="small" className={styles.exportBtn}>
            Export Video
          </Button>
        </div>
      </header>

      {/* 五区主体 */}
      <div className={styles.body}>
        <SideNavBar />
        <MediaPanel assets={projectAssets.length > 0 ? projectAssets : mockAssets} />
        <main className={styles.centerPane}>
          <div className={styles.previewArea}>
            <VideoPlayer />
          </div>
          <div className={styles.timelineArea}>
            <Timeline />
          </div>
        </main>
        <InspectorPanel />
        <ToolSidebar />
      </div>
    </div>
  );
};

export default Editor;
