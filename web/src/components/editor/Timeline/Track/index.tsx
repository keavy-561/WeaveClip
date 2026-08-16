import React from 'react';
import type { Track as TrackType } from '@/types/timeline';
import Clip from '../Clip';
import styles from './index.module.scss';

interface TrackProps {
  track: TrackType;
  pxPerSec: number;
  selectedClipId: string | null;
  onSelectClip: (clipId: string | null) => void;
}

const Track: React.FC<TrackProps> = ({
  track,
  pxPerSec,
  selectedClipId,
  onSelectClip,
}) => {
  return (
    <div
      className={`${styles.track} ${styles[track.type]}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        const assetId = e.dataTransfer.getData('application/x-asset-id');
        if (assetId) {
          // Phase 1 将实现素材拖入时间轴；Phase 0 仅占位
        }
      }}
    >
      {track.clips.map((clip) => (
        <Clip
          key={clip.id}
          clip={clip}
          trackType={track.type}
          pxPerSec={pxPerSec}
          isSelected={clip.id === selectedClipId}
          onSelect={() => onSelectClip(clip.id)}
        />
      ))}
    </div>
  );
};

export default Track;
