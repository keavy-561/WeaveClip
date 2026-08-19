import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Empty, Skeleton } from '@douyinfe/semi-ui';
import {
  IconUndo,
  IconRedo,
  IconSetting,
  IconShare,
  IconDownload,
  IconArrowLeft,
} from '@douyinfe/semi-icons';
import Logo from '@/components/ui/Logo';
import SideNavBar from '@/components/editor/SideNavBar';
import MediaPanel from '@/components/editor/MediaPanel';
import VideoPlayer from '@/components/editor/VideoPlayer';
import Timeline from '@/components/editor/Timeline';
import InspectorPanel from '@/components/editor/InspectorPanel';
import ToolSidebar from '@/components/editor/ToolSidebar';
import ThemeToggle from '@/components/ui/ThemeToggle';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import { useProjectStore } from '@/stores/projectStore';
import { useTimelineStore } from '@/stores/timelineStore';
import { useAIChatStore } from '@/stores/aiChatStore';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { useQuery } from '@tanstack/react-query';
import { projectService } from '@/services/projectService';
import { assetService } from '@/services/assetService';
import { mockProjects, mockAssets, mockTimelineDSL, mockChatMessages } from '@/utils/mockData';
import styles from './index.module.scss';

const isMockMode = import.meta.env.VITE_API_MODE === 'mock';

const Editor: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { t } = useAppTranslation();

  const setCurrentProject = useProjectStore((s) => s.setCurrentProject);
  const setDSL = useTimelineStore((s) => s.setDSL);
  const addMessage = useAIChatStore((s) => s.addMessage);
  const clearMessages = useAIChatStore((s) => s.clearMessages);

  const {
    data: project,
    isLoading: projectLoading,
    error: projectError,
  } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectService.get(projectId!),
    enabled: !!projectId && !isMockMode,
    retry: false,
  });

  const {
    data: assets = [],
    isLoading: assetsLoading,
    error: assetsError,
  } = useQuery({
    queryKey: ['assets', projectId],
    queryFn: () => assetService.list(projectId!),
    enabled: !!projectId && !isMockMode,
    retry: false,
  });

  useEffect(() => {
    if (isMockMode) {
      const p =
        mockProjects.find((p) => p.id === projectId) ??
        ({
          id: projectId ?? 'proj_new',
          name: t('editor.header.projectName'),
          status: 'draft',
          duration: 45,
          aspectRatio: '9:16',
          style: 'energetic',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as const);
      setCurrentProject({ ...p });
      setDSL(mockTimelineDSL);
      clearMessages();
      mockChatMessages.forEach((m) => addMessage(m));
      return;
    }

    if (project) {
      setCurrentProject({
        id: project.id,
        name: project.name,
        status: project.status,
        duration: project.duration,
        aspectRatio: project.aspectRatio,
        style: project.style,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        thumbnailUrl: project.thumbnailUrl,
      });
      setDSL(mockTimelineDSL);
      clearMessages();
      mockChatMessages.forEach((m) => addMessage(m));
    }
  }, [projectId, project, isMockMode]);

  const currentProject = useProjectStore((s) => s.currentProject);

  const displayAssets =
    !isMockMode && projectId
      ? assetsLoading
        ? []
        : assets.length > 0
          ? assets
          : mockAssets
      : mockAssets.filter((a) => a.projectId === (projectId === 'proj_new' ? 'proj_1' : projectId));

  useEffect(() => {
    document.title = currentProject?.name
      ? `${currentProject.name} - ${t('common.appName')}`
      : `${t('editor.header.projectName')} - ${t('common.appName')}`;
  }, [currentProject?.name, t]);

  const apiError = projectError || assetsError;

  return (
    <div className={styles.page}>
      {/* 顶部栏 */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Button
            icon={<IconArrowLeft />}
            theme="borderless"
            size="small"
            className={styles.iconBtn}
            aria-label={t('common.back', 'Back')}
            onClick={() => navigate('/projects')}
          />
          <Logo size="small" />
          <nav className={styles.navLinks}>
            <button className={`${styles.navLink} ${styles.active}`}>{t('editor.header.drafts')}</button>
            <button className={styles.navLink}>{t('editor.header.templates')}</button>
          </nav>
        </div>
        <div className={styles.headerCenter}>
          <span className={styles.projectName}>
            {currentProject?.name || t('editor.header.projectName')}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </span>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.aspectBtn}>
            {t('editor.header.aspectRatio')}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </span>
          <ThemeToggle />
          <LanguageSwitcher />
          <Button
            icon={<IconUndo />}
            theme="borderless"
            size="small"
            className={styles.iconBtn}
            aria-label={t('common.undo')}
          />
          <Button
            icon={<IconRedo />}
            theme="borderless"
            size="small"
            className={styles.iconBtn}
            aria-label={t('common.redo')}
          />
          <Button
            icon={<IconSetting />}
            theme="borderless"
            size="small"
            className={styles.iconBtn}
            aria-label={t('common.settings')}
          />
          <Button theme="borderless" size="small" className={styles.shareBtn}>
            <IconShare />
            {t('common.share')}
          </Button>
          <Button icon={<IconDownload />} theme="solid" size="small" className={styles.exportBtn}>
            {t('common.exportVideo')}
          </Button>
        </div>
      </header>

      {/* 五区主体 */}
      <div className={styles.body}>
        <SideNavBar />
        <MediaPanel assets={displayAssets} />
        <main className={styles.centerPane}>
          {projectLoading ? (
            <div className={styles.loadingOverlay}>
              <Skeleton loading active />
            </div>
          ) : apiError ? (
              <div className={styles.errorState}>
                <Empty
                  description={t('editor.loadError', 'Failed to load editor data')}
                  image={<IconArrowLeft className={styles.errorIcon} />}
                />
                <Button theme="solid" onClick={() => navigate('/projects')}>
                  {t('common.back')}
                </Button>
              </div>
          ) : (
            <>
              <div className={styles.previewArea}>
                <VideoPlayer />
              </div>
              <div className={styles.timelineArea}>
                <Timeline />
              </div>
            </>
          )}
        </main>
        <InspectorPanel />
        <ToolSidebar />
      </div>
    </div>
  );
};

export default Editor;
