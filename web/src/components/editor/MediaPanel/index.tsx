import React, { useState } from 'react';
import { Button, Empty, Input, Popconfirm, Slider, Switch, Toast } from '@douyinfe/semi-ui';
import { IconPlus, IconArrowRight, IconDelete, IconSearch } from '@douyinfe/semi-icons';
import { useQueryClient } from '@tanstack/react-query';
import type { Asset } from '@/types/asset';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { useEditorUIStore, type EditorTool } from '@/stores/editorUIStore';
import { useAssetsStore } from '@/stores/assetsStore';
import { assetService } from '@/services/assetService';
import { mockAssets } from '@/utils/mockData';
import AIChat from '@/components/editor/AIChat';
import TranscriptPanel from '@/components/editor/TranscriptPanel';
import styles from './index.module.scss';

const isMockMode = import.meta.env.VITE_API_MODE === 'mock';

interface MediaPanelProps {
  assets: Asset[];
}

/** 格式化 mm:ss 时长徽标 */
const formatBadge = (duration: number): string =>
  `${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, '0')}`;

const MediaPanel: React.FC<MediaPanelProps> = ({ assets }) => {
  const [tab, setTab] = useState<string>('library');
  const [query, setQuery] = useState<string>('');
  const [autoCaptions, setAutoCaptions] = useState<boolean>(true);
  const [noiseReduction, setNoiseReduction] = useState<number>(40);
  // mock 模式下被本地删除的素材 id（mockAssets 为只读回退数据，无法真正移除）
  const [removedIds, setRemovedIds] = useState<Set<string>>(() => new Set());
  const activeTool = useEditorUIStore((s) => s.activeTool);
  const storedAssets = useAssetsStore((s) => s.assets);
  const setAssets = useAssetsStore((s) => s.setAssets);
  const queryClient = useQueryClient();
  const { t } = useAppTranslation();

  // 非 media 工具：渲染“开发中”占位面板（缺陷走查 P0-3）
  const toolLabels: Record<Exclude<EditorTool, 'media'>, string> = {
    record: t('nav.record'),
    content: t('nav.content'),
    ai: t('nav.aiTools'),
    text: t('nav.text'),
    brand: t('nav.brand'),
    help: t('common.help'),
  };

  if (activeTool === 'content') {
    // 内容面板：展示素材转录文本（工单 WO2-02）
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <span className={styles.title}>{toolLabels.content}</span>
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
          <span className={styles.title}>{toolLabels.ai}</span>
        </div>
        <AIChat />
      </div>
    );
  }

  if (activeTool !== 'media') {
    const toolLabel = toolLabels[activeTool];
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <span className={styles.title}>{toolLabel}</span>
        </div>
        <div className={styles.toolPlaceholder}>
          <Empty description={t('editor.panel.developing', { tool: toolLabel })} />
        </div>
      </div>
    );
  }

  // 素材来源：优先 assetsStore，其次父级传入的 assets，最后回退 mockAssets；
  // 过滤掉本地已删除的素材（mock 回退数据无法真正移除，用本地列表兜底）
  const sourceAssets = (storedAssets.length > 0 ? storedAssets : assets.length > 0 ? assets : mockAssets)
    .filter((a) => !removedIds.has(a.id));
  const videos = sourceAssets.filter((a) => a.type === 'video');
  const filtered = videos.filter((a) =>
    a.fileName.toLowerCase().includes(query.toLowerCase())
  );

  /** 拖拽开始时写入 dataTransfer，供时间轴 onDrop 读取 */
  const handleAssetDragStart = (asset: Asset) => (e: React.DragEvent) => {
    e.dataTransfer.setData('application/x-asset-id', asset.id);
    e.dataTransfer.effectAllowed = 'copy';
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
        <Button size="small" theme="borderless" icon={<IconPlus />} aria-label={t('common.importMedia')} />
      </div>

      <div className={styles.tabBar}>
        <Button
          theme="borderless"
          className={`${styles.segment} ${tab === 'library' ? styles.segmentActive : ''}`}
          onClick={() => setTab('library')}
        >
          {t('editor.mediaPanel.library')}
        </Button>
        <Button
          theme="borderless"
          className={`${styles.segment} ${tab === 'media' ? styles.segmentActive : ''}`}
          onClick={() => setTab('media')}
        >
          {t('editor.mediaPanel.media')}
        </Button>
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
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>{t('editor.mediaPanel.recentAssets')}</h3>
            <IconArrowRight className={styles.sectionArrow} />
          </div>
          <div className={styles.assetGrid}>
            {filtered.slice(0, 4).map((asset) => (
              <div
                key={asset.id}
                className={styles.assetCard}
                draggable
                onDragStart={handleAssetDragStart(asset)}
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
            <IconArrowRight className={styles.sectionArrow} />
          </div>
          <div className={styles.horizontalList}>
            {filtered.slice(0, 4).map((asset) => (
              <div
                key={asset.id}
                className={styles.horizontalCard}
                draggable
                onDragStart={handleAssetDragStart(asset)}
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
                      {t('editor.mediaPanel.quality4K')} {formatBadge(asset.duration)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>{t('editor.mediaPanel.aiEnhancements')}</h3>
          <div className={styles.aiSection}>
            <div className={styles.aiRow}>
              <span className={styles.aiLabel}>{t('editor.mediaPanel.styleTransfer')}</span>
              <Button size="small" theme="borderless">{t('editor.mediaPanel.selectStyle')}</Button>
            </div>
            <div className={styles.aiRow}>
              <span className={styles.aiLabel}>{t('editor.mediaPanel.autoCaptions')}</span>
              <Switch
                size="small"
                checked={autoCaptions}
                onChange={(checked) => setAutoCaptions(checked)}
                aria-label={t('editor.mediaPanel.autoCaptions')}
              />
            </div>
            <div className={styles.aiRow}>
              <span className={styles.aiLabel}>{t('editor.mediaPanel.noiseReduction')}</span>
              <div className={styles.sliderRow}>
                <Slider
                  min={0}
                  max={100}
                  step={1}
                  value={noiseReduction}
                  onChange={(v) => setNoiseReduction(v as number)}
                  className={styles.slider}
                  aria-label={t('editor.mediaPanel.noiseReduction')}
                />
                <span className={styles.sliderValue}>{noiseReduction}%</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default MediaPanel;
