import React from 'react';
import { IconVideo, IconImage, IconMusic, IconFont } from '@douyinfe/semi-icons';
import type { Clip as ClipType } from '@/types/timeline';
import { mockAssets } from '@/utils/mockData';
import styles from './index.module.scss';

interface ClipProps {
  clip: ClipType;
  trackType: 'video' | 'caption' | 'audio' | 'effect';
  pxPerSec: number;
  isSelected: boolean;
  onSelect: () => void;
}

const Clip: React.FC<ClipProps> = ({
  clip,
  trackType,
  pxPerSec,
  isSelected,
  onSelect,
}) => {
  const asset = clip.assetId
    ? mockAssets.find((a) => a.id === clip.assetId)
    : null;

  const label =
    trackType === 'caption'
      ? clip.text ?? 'Caption'
      : asset?.fileName ?? 'Clip';

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

  return (
    <div
      className={`${styles.clip} ${styles[trackType]} ${isSelected ? styles.selected : ''}`}
      style={{
        left: clip.start * pxPerSec,
        width: Math.max(clip.duration * pxPerSec, 20),
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      title={`${label} (${clip.duration.toFixed(1)}s)`}
    >
      <span className={styles.clipIcon}>{typeIcon}</span>
      <span className={styles.clipLabel}>{label}</span>

      {/* Trim 手柄（Phase 1 实现交互） */}
      <span className={`${styles.handle} ${styles.left}`} />
      <span className={`${styles.handle} ${styles.right}`} />
    </div>
  );
};

export default Clip;
