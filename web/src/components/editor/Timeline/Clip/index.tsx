import React from 'react';
import {
  IconVideo,
  IconImage,
  IconMusic,
  IconFont,
  IconAIWandLevel1,
} from '@douyinfe/semi-icons';
import type { Clip as ClipType } from '@/types/timeline';
import { mockAssets } from '@/utils/mockData';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const asset = clip.assetId
    ? mockAssets.find((a) => a.id === clip.assetId)
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
      title={`${label} (${clip.duration.toFixed(1)}s)`}
    >
      {trackType === 'video' && (
        <div className={styles.filmstrip}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={styles.filmstripFrame} />
          ))}
        </div>
      )}

      {trackType === 'audio' && (
        <div className={styles.waveform}>
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className={styles.waveformBar}
              style={{
                height: `${20 + Math.random() * 60}%`,
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

      {/* Trim 手柄（Phase 1 实现交互） */}
      <span className={`${styles.handle} ${styles.left}`} />
      <span className={`${styles.handle} ${styles.right}`} />
    </div>
  );
};

export default Clip;
