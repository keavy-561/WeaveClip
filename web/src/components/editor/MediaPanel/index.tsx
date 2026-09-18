import React, { useState } from 'react';
import { Button, Empty, Input, Slider, Switch } from '@douyinfe/semi-ui';
import { IconPlus, IconArrowRight, IconSearch } from '@douyinfe/semi-icons';
import type { Asset } from '@/types/asset';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { useEditorUIStore, type EditorTool } from '@/stores/editorUIStore';
import { useAssetsStore } from '@/stores/assetsStore';
import { mockAssets } from '@/utils/mockData';
import styles from './index.module.scss';

const ASSET_IMAGES: Record<string, string> = {
  asset_01: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD5t2CMfKsH5ke_RmKFLCqdOHPnI6M8Zn-U1hNep4ehXBzfPdebI2P_ty6oBddArLpHMVSWdxQNjrfLMZwxKr2-INNOU8OHHztNAVmHXsv1c7FNNZruoDHtUtHLoTCCKXzLG754ZS7wRao2jvEPIDQo66VCyf55Ipt_qi8L3UuQpNjDu0NYyNli6oPgL3soui-qoqM17VYGSknDdpIseFBR-ilcETv0isAoGU5MaX5VruxRiaBlZI-c_g',
  asset_02: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCC7qJIQ1KQOs8_H0eY8vdsK55JlBwMB5BpLHREjyLE6MZMjxwSCBUBWa8eVuomkWrlEn-xp0QY6Pj3CmjGZNrYFfHQz2wXi0sC5GJFyZYRJ4d8jyUoL1qL64lzdMUVWHiRZM2NxN73PbIWZDqMVxZ2m2JoFYJ8Jq7eLCdjoRPp-tbYu_TnYuzMF0C0Dff7-yJ-BCn_6uH2bE_RGca_G5BD0UTaGd1JnzjScesPyy9mX2sEeY0Cf4gw1w',
  asset_03: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDJ2zMKwMFws3IuXEdm7iG4rVF1bcj66rog5fF8_njEt33ONfeCb0XiyWp6Hyv5x18QGQGRZCzER1pNM5Ywg_E0eY42xE3uGIxbGyah8dmt5WCR_kMUXwlB04pE149OjZMZKu7bvpeoU8CamPVWKvQB9KZY1YkIJ4T-0WJQoJ-KBsbcJKdNkTk3WEFvLgdHUD0U0heQZYBoixp9uyrkAEBjoIwafTqfI_AzP-94AGFLZhzSdmgnacng3w',
  asset_04: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDXpyJ05fJFVnRUe2X3XLDyAWZTHwWPTLBglUUazIkhQPXx-6lty2Q2lUx3eIqMxgAIoMO9YuvP9OKdIHIQQMcOWQrGlO2juOxxGkaYVBYQlIWotvwDLbHFXwhJoTdKiGC9t-0rdv9MShl2QGgiiYucA97dsP4UMb25jSCjYi9qml_oT77Pi2GjBr7BtBnK20OWhPALc_MZi8mWwfvvBbwEuf4phkLRB61b-vnqfmp7F1DOeIImycNfg',
  asset_05: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDrRUynQrsKtloYqXPqHJ66v4aX7Wx4e4ZRARDS_f0cZjDMKve_KjyVdUmfN_mCV16KaphvR24Ra6hito-9v3HjHlphizj3EpkD3UweWxQ40N5pYieHpSYLM_QN3zWCaZigytPGpsZpUD0EovYKiEh_S8iuzFTLzqN98qtWy-bRBvyDiHMNys1R_QY8YyeeBot_MZHyLfMxClO_Q7OgJCEiTlO-orI5ZZH2WQ0axS7NkxGcuXKrbDO-Tw',
};

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
  const activeTool = useEditorUIStore((s) => s.activeTool);
  const storedAssets = useAssetsStore((s) => s.assets);
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

  // 素材来源：优先 assetsStore，其次父级传入的 assets，最后回退 mockAssets
  const sourceAssets = storedAssets.length > 0 ? storedAssets : assets.length > 0 ? assets : mockAssets;
  const videos = sourceAssets.filter((a) => a.type === 'video');
  const filtered = videos.filter((a) =>
    a.fileName.toLowerCase().includes(query.toLowerCase())
  );

  /** 拖拽开始时写入 dataTransfer，供时间轴 onDrop 读取 */
  const handleAssetDragStart = (asset: Asset) => (e: React.DragEvent) => {
    e.dataTransfer.setData('application/x-asset-id', asset.id);
    e.dataTransfer.effectAllowed = 'copy';
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
                  <img
                    className={styles.assetImg}
                    src={asset.thumbnailUrl ?? ASSET_IMAGES[asset.id] ?? ''}
                    alt={asset.fileName}
                    loading="lazy"
                  />
                  <div className={styles.assetOverlay}>
                    <IconPlus />
                  </div>
                  {asset.duration && (
                    <span className={styles.durationBadge}>{formatBadge(asset.duration)}</span>
                  )}
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
                  <img
                    className={styles.horizontalImg}
                    src={asset.thumbnailUrl ?? ASSET_IMAGES[asset.id] ?? ''}
                    alt={asset.fileName}
                    loading="lazy"
                  />
                  <div className={styles.horizontalOverlay}>
                    <span className={styles.horizontalLabel}>{t('editor.mediaPanel.horizontalLabel')}</span>
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
