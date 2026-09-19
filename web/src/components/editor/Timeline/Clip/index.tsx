import React, { useMemo } from 'react';
import {
  IconVideo,
  IconImage,
  IconMusic,
  IconFont,
  IconAIWandLevel1,
} from '@douyinfe/semi-icons';
import type { Clip as ClipType } from '@/types/timeline';
import { useTimelineStore } from '@/stores/timelineStore';
import { useAssetsStore } from '@/stores/assetsStore';
import { mockAssets } from '@/utils/mockData';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import styles from './index.module.scss';

interface ClipProps {
  clip: ClipType;
  trackType: 'video' | 'caption' | 'audio' | 'effect';
  pxPerSec: number;
  isSelected: boolean;
  onSelect: () => void;
}

/** Trim 手柄最小像素宽度，换算为最小片段时长保护 */
const MIN_HANDLE_PX = 20;

type TrimSide = 'left' | 'right';

const Clip: React.FC<ClipProps> = ({
  clip,
  trackType,
  pxPerSec,
  isSelected,
  onSelect,
}) => {
  const { t } = useAppTranslation();
  const updateClip = useTimelineStore((s) => s.updateClip);
  const pushHistory = useTimelineStore((s) => s.pushHistory);
  const storedAssets = useAssetsStore((s) => s.assets);

  // 优先从 assetsStore 查素材，查不到回退 mockAssets（mock 模式保持可用）
  const asset = clip.assetId
    ? storedAssets.find((a) => a.id === clip.assetId) ??
      mockAssets.find((a) => a.id === clip.assetId)
    : null;

  const label =
    trackType === 'caption'
      ? clip.text ?? t('editor.timeline.text')
      : asset?.fileName ?? t('editor.timeline.clipDefault');

  const typeIcon =
    trackType === 'audio' ? (
      <IconMusic />
    ) : trackType === 'caption' ? (
      <IconFont />
    ) : asset?.type === 'image' ? (
      <IconImage />
    ) : (
      <IconVideo />
    );

  const width = Math.max(clip.duration * pxPerSec, 20);

  /**
   * Trim 拖拽：mousedown 记录起点并压入一次历史，
   * document mousemove 连续更新（跳过历史），mouseup 移除监听
   */
  const startTrim = (side: TrimSide) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const origStart = clip.start;
    const origDuration = clip.duration;
    const origSourceStart = clip.sourceStart;
    const origSourceDuration = clip.sourceDuration;
    // 最小宽度保护：至少保留 MIN_HANDLE_PX 对应的时长
    const minDuration = Math.max(0.1, MIN_HANDLE_PX / pxPerSec);
    // 一次拖拽只记一条历史
    pushHistory();

    const onMove = (ev: MouseEvent) => {
      const delta = (ev.clientX - startX) / pxPerSec;
      if (side === 'left') {
        // 左手柄：不越过时间轴起点，且至少保留最小时长
        const d = Math.min(Math.max(delta, -origStart), origDuration - minDuration);
        const updates: Partial<ClipType> = {
          start: origStart + d,
          duration: origDuration - d,
        };
        // 仅当原始数据带源区间时同步维护，避免给图片等素材凭空造字段
        if (origSourceStart !== undefined) updates.sourceStart = origSourceStart + d;
        if (origSourceDuration !== undefined) updates.sourceDuration = origSourceDuration - d;
        updateClip(clip.id, updates, { skipHistory: true });
      } else {
        // 右手柄：只向右拉伸/收缩，至少保留最小时长
        const d = Math.max(delta, minDuration - origDuration);
        const updates: Partial<ClipType> = { duration: origDuration + d };
        if (origSourceDuration !== undefined) updates.sourceDuration = origSourceDuration + d;
        updateClip(clip.id, updates, { skipHistory: true });
      }
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  /** 片段拖拽重排：写入 clipId，供轨道 onDrop 读取 */
  const handleDragStart = (e: React.DragEvent) => {
    // 从 Trim 手柄上发起的拖动不进入重排流程
    if (e.target instanceof HTMLElement && e.target.closest('[data-trim-handle]')) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('application/x-clip-id', clip.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const thumbnailUrl = asset?.thumbnailUrl ?? null;

  // 波形高度：按索引确定性生成，避免每次渲染随机跳动（几何值由数据驱动，沿用内联写法）
  const waveHeights = useMemo(
    () => Array.from({ length: 40 }, (_, i) => 20 + ((i * 37) % 60)),
    []
  );

  return (
    <div
      className={`${styles.clip} ${styles[trackType]} ${isSelected ? styles.selected : ''}`}
      style={{
        left: clip.start * pxPerSec,
        width,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onSelect();
        }
      }}
      draggable
      onDragStart={handleDragStart}
      role="button"
      tabIndex={0}
      title={`${label} (${clip.duration.toFixed(1)}s)`}
    >
      {trackType === 'video' && (
        <div className={styles.filmstrip}>
          {thumbnailUrl ? (
            // 有真实缩略图时铺满整段
            <img className={styles.filmstripImg} src={thumbnailUrl} alt="" loading="lazy" />
          ) : (
            [1, 2, 3, 4].map((i) => <div key={i} className={styles.filmstripFrame} />)
          )}
        </div>
      )}

      {trackType === 'audio' && (
        <div className={styles.waveform}>
          {waveHeights.map((h, i) => (
            <div
              key={i}
              className={styles.waveformBar}
              style={{
                height: `${h}%`,
              }}
            />
          ))}
        </div>
      )}

      {(trackType === 'caption' || trackType === 'effect') && (
        <div className={styles.pillContent}>
          <span className={styles.pillIcon}>
            {trackType === 'effect' ? <IconAIWandLevel1 /> : <IconFont />}
          </span>
          <div className={styles.pillText}>
            <span className={styles.pillTitle}>
              {trackType === 'effect' ? t('editor.timeline.vividEffects') : t('editor.timeline.text')}
            </span>
            <span className={styles.pillSub}>
              {trackType === 'effect' ? t('editor.timeline.effectSubtitle') : (clip.text ?? t('editor.timeline.captionSubtitle'))}
            </span>
          </div>
        </div>
      )}

      {trackType !== 'caption' && trackType !== 'effect' && (
        <>
          <span className={styles.clipIcon}>{typeIcon}</span>
          <span className={styles.clipLabel}>{label}</span>
        </>
      )}

      {/* Trim 手柄：按住左右拖拽调整片段入点/出点 */}
      <span
        className={`${styles.handle} ${styles.left}`}
        data-trim-handle
        onMouseDown={startTrim('left')}
        onClick={(e) => e.stopPropagation()}
      />
      <span
        className={`${styles.handle} ${styles.right}`}
        data-trim-handle
        onMouseDown={startTrim('right')}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
};

export default Clip;
