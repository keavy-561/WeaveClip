import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Empty, Skeleton, Toast } from '@douyinfe/semi-ui';
import {
  IconUndo,
  IconRedo,
  IconSetting,
  IconShare,
  IconDownload,
  IconArrowLeft,
  IconChevronLeft,
  IconChevronRight,
} from '@douyinfe/semi-icons';
import Logo from '@/components/ui/Logo';
import SideNavBar from '@/components/editor/SideNavBar';
import MediaPanel from '@/components/editor/MediaPanel';
import VideoPlayer from '@/components/editor/VideoPlayer';
import Timeline from '@/components/editor/Timeline';
import InspectorPanel from '@/components/editor/InspectorPanel';
import ToolSidebar from '@/components/editor/ToolSidebar';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import { useProjectStore } from '@/stores/projectStore';
import { useTimelineStore } from '@/stores/timelineStore';
import { useEditorUIStore } from '@/stores/editorUIStore';
import { useAIChatStore } from '@/stores/aiChatStore';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { useQuery } from '@tanstack/react-query';
import { projectService } from '@/services/projectService';
import { assetService } from '@/services/assetService';
import { timelineService } from '@/services/timelineService';
import { useAssetsStore } from '@/stores/assetsStore';
import { useEditorShortcuts } from '@/hooks/useEditorShortcuts';
import { backendToFront, frontToBackend } from '@/utils/dslAdapter';
import ExportDialog from '@/components/editor/ExportDialog';
import VersionHistory from '@/components/editor/VersionHistory';
import TemplatesSideSheet from '@/components/editor/TemplatesSideSheet';
import { IconHistory } from '@douyinfe/semi-icons';
import { mockProjects, mockAssets, mockTimelineDSL, mockChatMessages } from '@/utils/mockData';
import styles from './index.module.scss';

const isMockMode = import.meta.env.VITE_API_MODE === 'mock';

const Editor: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { t } = useAppTranslation();
  const [exportOpen, setExportOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  // 自动保存：时间线水合完成后才允许写回，避免“加载即保存”
  const hydratedRef = useRef(false);
  const lastSavedRef = useRef('');

  const setCurrentProject = useProjectStore((s) => s.setCurrentProject);
  const setDSL = useTimelineStore((s) => s.setDSL);
  // 面板折叠（WO5-05）与顶栏撤销/重做（WO5-04，与时间轴工具条共用 store）
  const mediaCollapsed = useEditorUIStore((s) => s.mediaCollapsed);
  const toggleMediaCollapsed = useEditorUIStore((s) => s.toggleMediaCollapsed);
  const inspectorCollapsed = useEditorUIStore((s) => s.inspectorCollapsed);
  const toggleInspectorCollapsed = useEditorUIStore((s) => s.toggleInspectorCollapsed);
  const undo = useTimelineStore((s) => s.undo);
  const redo = useTimelineStore((s) => s.redo);
  const canUndo = useTimelineStore((s) => s.canUndo);
  const canRedo = useTimelineStore((s) => s.canRedo);
  const setAssets = useAssetsStore((s) => s.setAssets);
  const addMessage = useAIChatStore((s) => s.addMessage);
  const clearMessages = useAIChatStore((s) => s.clearMessages);

  const {
    data: project,
    isLoading: projectLoading,
    error: projectError,
  } = useQuery({
    queryKey: ['project', projectId, retryKey],
    queryFn: () => projectService.get(projectId!),
    enabled: !!projectId && !isMockMode,
    retry: false,
  });

  const {
    data: assets = [],
    isLoading: assetsLoading,
    error: assetsError,
  } = useQuery({
    queryKey: ['assets', projectId, retryKey],
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
    }
  }, [projectId, project, isMockMode]);

  // 真实模式：加载持久化的时间线（工单 F06；后端 B09 版本化端点）
  useEffect(() => {
    if (isMockMode || !projectId || !project) return;
    void timelineService.get(projectId)
      .then((timeline) => {
        hydratedRef.current = true;
        if (timeline?.timelineJson) {
          setDSL(backendToFront(timeline.timelineJson as Parameters<typeof backendToFront>[0]));
        }
      })
      .catch(() => {
        hydratedRef.current = true;
      });
  }, [projectId, project, isMockMode]);

  const currentProject = useProjectStore((s) => s.currentProject);
  const tracks = useTimelineStore((s) => s.tracks);
  const timelineDuration = useTimelineStore((s) => s.duration);

  // 素材来源（WO5-03）：真实模式只消费真实数据（空态由 MediaPanel 呈现引导，不再回退假素材），
  // mock 模式按项目过滤演示素材。useMemo 稳定数组标识：mock 分支每次渲染的新数组
  // 会让注入 assetsStore 的 effect 空转（工单 WO8-09）
  const displayAssets = useMemo(
    () =>
      !isMockMode
        ? assetsLoading
          ? []
          : assets
        : mockAssets.filter((a) => a.projectId === (projectId === 'proj_new' ? 'proj_1' : projectId)),
    [assets, assetsLoading, projectId]
  );

  // 素材注入全局 store：Clip/MediaPanel 由此读取真实素材信息
  useEffect(() => {
    setAssets(displayAssets);
  }, [displayAssets, setAssets]);

  // 防抖自动保存（真实模式，工单 F06）
  useEffect(() => {
    if (isMockMode || !hydratedRef.current || !projectId) return;
    const payload = frontToBackend({
      version: '1.0',
      fps: 30,
      duration: timelineDuration,
      width: 1080,
      height: 1920,
      tracks,
    });
    const json = JSON.stringify(payload);
    if (json === lastSavedRef.current || !tracks.length) return;
    const timer = window.setTimeout(() => {
      void timelineService.save(projectId, payload, 'editor autosave')
        .then(() => { lastSavedRef.current = json; })
        .catch(() => {
          /* 静默失败：下次变更会再次尝试 */
        });
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [tracks, timelineDuration, projectId]);

  // 键盘快捷键：Space/Delete/Ctrl+Z/Ctrl+Shift+Z（工单 F11）
  useEditorShortcuts();

  useEffect(() => {
    document.title = currentProject?.name
      ? `${currentProject.name} - ${t('common.appName')}`
      : `${t('editor.header.projectName')} - ${t('common.appName')}`;
  }, [currentProject?.name, t]);

  const apiError = projectError || assetsError;

  // 分享真实化（WO6-02）：优先系统分享面板，否则复制项目链接到剪贴板
  const handleShare = async () => {
    const url = `${window.location.origin}/editor/${projectId}`;
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: currentProject?.name ?? t('common.appName'), url });
        return;
      }
      await navigator.clipboard.writeText(url);
      Toast.success(t('editor.header.linkCopied'));
    } catch (error) {
      // 用户取消系统分享面板不视为失败
      if ((error as DOMException)?.name === 'AbortError') return;
      // 非安全上下文（http）没有 clipboard API：退化为 execCommand 复制
      try {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        Toast.success(t('editor.header.linkCopied'));
      } catch {
        Toast.error(t('editor.header.shareFailed'));
      }
    }
  };

  // 模板中心（WO6-01）：模板 prompt 预填进 AI 对话并切到 AI 面板
  const handleUseTemplate = (prompt: string) => {
    setTemplatesOpen(false);
    useAIChatStore.getState().setDraft(prompt);
    useEditorUIStore.getState().setActiveTool('ai');
  };

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
            <Button
              theme="borderless"
              className={`${styles.navLink} ${styles.active}`}
              size="small"
              onClick={() => navigate('/projects')}
            >
              {t('editor.header.drafts')}
            </Button>
            <Button
              theme="borderless"
              className={styles.navLink}
              size="small"
              onClick={() => setTemplatesOpen(true)}
            >
              {t('editor.header.templates')}
            </Button>
          </nav>
        </div>
        <div className={styles.headerCenter}>
          {/* 项目名与画幅为展示信息，去掉伪装可点的箭头/指针样式（WO5-09） */}
          <span className={styles.projectName}>
            {currentProject?.name || t('editor.header.projectName')}
          </span>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.aspectBtn}>
            {t('editor.header.aspectRatio')}
          </span>
          <LanguageSwitcher />
          <Button
            icon={<IconHistory />}
            theme="borderless"
            size="small"
            className={styles.iconBtn}
            aria-label={t('editor.versionHistory.title')}
            onClick={() => setHistoryOpen(true)}
          />
          <Button
            icon={<IconUndo />}
            theme="borderless"
            size="small"
            className={`${styles.iconBtn} ${styles.headerUndoRedo}`}
            disabled={!canUndo}
            onClick={undo}
            aria-label={t('common.undo')}
          />
          <Button
            icon={<IconRedo />}
            theme="borderless"
            size="small"
            className={`${styles.iconBtn} ${styles.headerUndoRedo}`}
            disabled={!canRedo}
            onClick={redo}
            aria-label={t('common.redo')}
          />
          <Button
            icon={<IconSetting />}
            theme="borderless"
            size="small"
            className={styles.iconBtn}
            aria-label={t('common.settings')}
            onClick={() => navigate('/settings')}
          />
          <Button
            theme="borderless"
            size="small"
            className={styles.shareBtn}
            onClick={() => void handleShare()}
          >
            <IconShare />
            {t('common.share')}
          </Button>
          <Button
            icon={<IconDownload />}
            theme="solid"
            size="small"
            className={styles.exportBtn}
            onClick={() => setExportOpen(true)}
          >
            {t('common.exportVideo')}
          </Button>
        </div>
      </header>

      {/* 五区主体 */}
      <div className={styles.body}>
        <SideNavBar />
        {mediaCollapsed ? (
          <Button
            className={styles.railBtn}
            icon={<IconChevronRight />}
            onClick={toggleMediaCollapsed}
            aria-label={t('common.expand')}
          />
        ) : (
          <MediaPanel assets={displayAssets} />
        )}
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
                <div className={styles.errorActions}>
                  <Button theme="solid" onClick={() => setRetryKey((key) => key + 1)}>
                    {t('common.retry', 'Retry')}
                  </Button>
                  <Button theme="light" onClick={() => navigate('/projects')}>
                    {t('common.back')}
                  </Button>
                </div>
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
        {inspectorCollapsed ? (
          <Button
            className={styles.railBtn}
            icon={<IconChevronLeft />}
            onClick={toggleInspectorCollapsed}
            aria-label={t('common.expand')}
          />
        ) : (
          <InspectorPanel />
        )}
        <ToolSidebar />
      </div>

      <ExportDialog projectId={projectId ?? ''} visible={exportOpen} onClose={() => setExportOpen(false)} />
      <VersionHistory projectId={projectId ?? ''} visible={historyOpen} onClose={() => setHistoryOpen(false)} />
      <TemplatesSideSheet visible={templatesOpen} onClose={() => setTemplatesOpen(false)} onUse={handleUseTemplate} />
    </div>
  );
};

export default Editor;
