import React, { useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Empty, Input, Popconfirm, Toast } from '@douyinfe/semi-ui';
import { IconPlus, IconChevronLeft, IconDelete, IconSearch } from '@douyinfe/semi-icons';
import { useQueryClient } from '@tanstack/react-query';
import type { Asset } from '@/types/asset';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { useEditorUIStore } from '@/stores/editorUIStore';
import { useAssetsStore } from '@/stores/assetsStore';
import { useTimelineStore } from '@/stores/timelineStore';
import { assetService } from '@/services/assetService';
import { mockAssets } from '@/utils/mockData';
import AIChat from '@/components/editor/AIChat';
import TranscriptPanel from '@/components/editor/TranscriptPanel';
import RecordPanel from '@/components/editor/RecordPanel';
import TextPanel from '@/components/editor/TextPanel';
import BrandPanel from '@/components/editor/BrandPanel';
import styles from './index.module.scss';

const isMockMode = import.meta.env.VITE_API_MODE === 'mock';

interface MediaPanelProps {
  assets: Asset[];
}

/** 格式化 mm:ss 时长徽标 */
const formatBadge = (duration: number): string =>
  `${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, '0')}`;

const MediaPanel: React.FC<MediaPanelProps> = ({ assets }) => {
  const [query, setQuery] = useState<string>('');
  const [importing, setImporting] = useState(false);
  // mock 模式下被本地删除的素材 id（mockAssets 为只读回退数据，无法真正移除）
  const [removedIds, setRemovedIds] = useState<Set<string>>(() => new Set());
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activeTool = useEditorUIStore((s) => s.activeTool);
  const toggleMediaCollapsed = useEditorUIStore((s) => s.toggleMediaCollapsed);
  const storedAssets = useAssetsStore((s) => s.assets);
  const setAssets = useAssetsStore((s) => s.setAssets);
  const addClip = useTimelineStore((s) => s.addClip);
  const queryClient = useQueryClient();
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { t } = useAppTranslation();

  /** 面板头部通用：标题 + 收起按钮（WO5-05 左侧面板可收起） */
  const collapseButton = (
    <Button
      size="small"
      theme="borderless"
      icon={<IconChevronLeft />}
      onClick={toggleMediaCollapsed}
      aria-label={t('common.collapse')}
    />
  );

  if (activeTool === 'content') {
    // 内容面板：展示素材转录文本（工单 WO2-02）
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <span className={styles.title}>{t('nav.content')}</span>
          {collapseButton}
        </div>
        <TranscriptPanel />
      </div>
    );
  }

  if (activeTool === 'ai') {
    // AI 对话面板接入真实的对话式编辑（工单 F07）
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <span className={styles.title}>{t('nav.aiTools')}</span>
          {collapseButton}
        </div>
        <AIChat />
      </div>
    );
  }

  if (activeTool === 'record') {
    // 录制面板（工单 WO6-07）：摄像头录制 → 素材库
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <span className={styles.title}>{t('nav.record')}</span>
          {collapseButton}
        </div>
        <RecordPanel />
      </div>
    );
  }

  if (activeTool === 'text') {
    // 文本面板（工单 WO6-08）：添加字幕片段
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <span className={styles.title}>{t('nav.text')}</span>
          {collapseButton}
        </div>
        <TextPanel />
      </div>
    );
  }

  if (activeTool === 'brand') {
    // 品牌面板（工单 WO6-09）：水印 + 字幕默认色
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <span className={styles.title}>{t('nav.brand')}</span>
          {collapseButton}
        </div>
        <BrandPanel />
      </div>
    );
  }

  if (activeTool === 'help') {
    // 帮助面板（工单 WO6-04）：接入教程页
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <span className={styles.title}>{t('common.help')}</span>
          {collapseButton}
        </div>
        <div className={styles.toolPlaceholder}>
          <Button theme="solid" onClick={() => navigate('/tutorials')}>
            {t('tutorials.openTutorials')}
          </Button>
        </div>
      </div>
    );
  }

  // 素材来源（WO5-03）：真实模式只消费真实数据（为空时渲染空态引导，不再回退假素材），
  // mock 模式回退演示数据；过滤掉本地已删除的素材
  const sourceAssets = (isMockMode ? mockAssets : storedAssets.length > 0 ? storedAssets : assets)
    .filter((a) => a.type === 'video' && !removedIds.has(a.id));
  const filtered = sourceAssets.filter((a) =>
    a.fileName.toLowerCase().includes(query.toLowerCase())
  );

  /** 拖拽开始时写入 dataTransfer，供时间轴 onDrop 读取 */
  const handleAssetDragStart = (asset: Asset) => (e: React.DragEvent) => {
    e.dataTransfer.setData('application/x-asset-id', asset.id);
    e.dataTransfer.effectAllowed = 'copy';
  };

  /** 点击素材快速追加到视频轨末尾（WO5-07，拖拽之外的快捷路径） */
  const handleAddToTimeline = (asset: Asset) => {
    const videoTrack = useTimelineStore.getState().tracks.find((tr) => tr.type === 'video');
    const end = videoTrack?.clips.reduce((max, c) => Math.max(max, c.start + c.duration), 0) ?? 0;
    addClip(asset.id, end);
    Toast.success(t('editor.mediaPanel.addedToTimeline'));
  };

  /** 编辑器内导入素材：presign → PUT 直传 → confirm（WO5-06） */
  const handleImportFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (isMockMode) {
      Toast.warning(t('editor.mediaPanel.importMockDisabled'));
      return;
    }
    setImporting(true);
    let ok = 0;
    let fail = 0;
    for (const file of Array.from(files)) {
      try {
        const type = file.type.startsWith('video')
          ? 'video'
          : file.type.startsWith('audio')
            ? 'audio'
            : 'image';
        const { uploadUrl, assetId } = await assetService.presign(projectId ?? '', {
          type,
          fileName: file.name,
          fileSize: file.size,
        });
        await assetService.uploadToPresigned(uploadUrl, file, file.type || 'application/octet-stream');
        await assetService.confirm(projectId ?? '', assetId);
        ok += 1;
      } catch {
        fail += 1;
      }
    }
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (ok > 0) {
      // 刷新 Editor 的 assets 查询，新素材经 assetsStore 同步到时间轴/检查器
      void queryClient.invalidateQueries({ queryKey: ['assets'] });
      Toast.success(t('editor.mediaPanel.importSuccess', { count: ok }));
    }
    if (fail > 0) {
      Toast.error(t('editor.mediaPanel.importFailedCount', { count: fail }));
    }
  };

  /** 素材删除（工单 WO2-05）：真实模式先调 API，失败 Toast 并中止；mock 模式仅本地移除 */
  const handleRemoveAsset = async (asset: Asset) => {
    if (!isMockMode) {
      try {
        await assetService.remove(asset.id);
      } catch {
        Toast.error(t('editor.mediaPanel.deleteFailed'));
        return;
      }
      // 后端已删除：刷新素材查询缓存（Editor 加载效果会把新列表重新注入 assetsStore）
      void queryClient.invalidateQueries({ queryKey: ['assets'] });
    }
    // 本地兜底过滤（真实模式下用于覆盖 refetch 返回前的窗口期）
    setRemovedIds((prev) => {
      const next = new Set(prev);
      next.add(asset.id);
      return next;
    });
    // 同步移除 assetsStore，保证 Timeline/Clip 等消费方立即感知
    setAssets(useAssetsStore.getState().assets.filter((a) => a.id !== asset.id));
    Toast.success(t('editor.mediaPanel.deleteSuccess'));
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>{t('editor.mediaPanel.title')}</span>
        {collapseButton}
        {/* 隐藏文件选择器由 Semi 按钮触发（WO5-06 编辑器内导入素材） */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="video/*,audio/*,image/*"
          className={styles.hiddenFileInput}
          onChange={(e) => void handleImportFiles(e.target.files)}
        />
        <Button
          size="small"
          theme="borderless"
          icon={<IconPlus />}
          loading={importing}
          onClick={() => fileInputRef.current?.click()}
          aria-label={t('common.importMedia')}
        />
      </div>

      <div className={styles.search}>
        <Input
          prefix={<IconSearch />}
          placeholder={t('common.searchPlaceholder')}
          value={query}
          onChange={(v) => setQuery(v)}
          aria-label={t('common.search')}
          showClear
          className={styles.searchInput}
        />
      </div>

      <div className={styles.content}>
        {sourceAssets.length === 0 ? (
          <div className={styles.emptyWrap}>
            <Empty description={t('editor.mediaPanel.emptyAssetsHint')} />
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyWrap}>
            <Empty description={t('editor.mediaPanel.noMatch')} />
          </div>
        ) : (
          <>
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>{t('editor.mediaPanel.recentAssets')}</h3>
              </div>
              <div className={styles.assetGrid}>
                {filtered.map((asset) => (
                  <div
                    key={asset.id}
                    className={styles.assetCard}
                    draggable
                    onDragStart={handleAssetDragStart(asset)}
                    onClick={() => handleAddToTimeline(asset)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleAddToTimeline(asset);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    title={asset.fileName}
                  >
                    <div className={styles.assetImage}>
                      {asset.thumbnailUrl ? (
                        <img
                          className={styles.assetImg}
                          src={asset.thumbnailUrl}
                          alt={asset.fileName}
                          loading="lazy"
                        />
                      ) : (
                        <div className={styles.assetPlaceholder} aria-hidden="true" />
                      )}
                      <div className={styles.assetOverlay}>
                        <IconPlus />
                      </div>
                      {asset.duration && (
                        <span className={styles.durationBadge}>{formatBadge(asset.duration)}</span>
                      )}
                      <Popconfirm
                        title={t('editor.mediaPanel.deleteConfirm')}
                        onConfirm={() => void handleRemoveAsset(asset)}
                      >
                        <Button
                          className={styles.deleteBtn}
                          icon={<IconDelete />}
                          size="small"
                          theme="solid"
                          type="danger"
                          aria-label={t('editor.mediaPanel.deleteAsset')}
                        />
                      </Popconfirm>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>{t('editor.mediaPanel.landscapeVideo')}</h3>
              </div>
              <div className={styles.horizontalList}>
                {filtered.map((asset) => (
                  <div
                    key={asset.id}
                    className={styles.horizontalCard}
                    draggable
                    onDragStart={handleAssetDragStart(asset)}
                    onClick={() => handleAddToTimeline(asset)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleAddToTimeline(asset);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    title={asset.fileName}
                  >
                    <div className={styles.horizontalImage}>
                      {asset.thumbnailUrl ? (
                        <img
                          className={styles.horizontalImg}
                          src={asset.thumbnailUrl}
                          alt={asset.fileName}
                          loading="lazy"
                        />
                      ) : (
                        <div className={styles.assetPlaceholder} aria-hidden="true" />
                      )}
                      <div className={styles.horizontalOverlay}>
                        <span className={styles.horizontalLabel}>{asset.fileName}</span>
                      </div>
                      {asset.duration && (
                        <span className={styles.durationBadge}>
                          {asset.width && asset.height ? `${asset.width}×${asset.height} · ` : ''}
                          {formatBadge(asset.duration)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default MediaPanel;
