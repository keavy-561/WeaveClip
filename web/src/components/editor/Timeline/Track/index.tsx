import React from 'react';
import type { Track as TrackType } from '@/types/timeline';
import { useTimelineStore } from '@/stores/timelineStore';
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
  const addClip = useTimelineStore((s) => s.addClip);
  const reorderClips = useTimelineStore((s) => s.reorderClips);

  /** 根据放下位置计算轨道内时间点（秒） */
  const getDropTime = (e: React.DragEvent<HTMLDivElement>): number => {
    const rect = e.currentTarget.getBoundingClientRect();
    return Math.max(0, (e.clientX - rect.left) / pxPerSec);
  };

  /** 把拖动的片段按放下位置插入到目标片段前后，返回新的 id 顺序 */
  const buildReorderIds = (dragClipId: string, dropTime: number): string[] | null => {
    const clips = track.clips;
    const fromIdx = clips.findIndex((c) => c.id === dragClipId);
    if (fromIdx === -1) return null;

    const order = clips.map((c) => c.id);
    order.splice(fromIdx, 1);

    const targetIdx = clips.findIndex(
      (c) => dropTime >= c.start && dropTime < c.start + c.duration
    );

    let insertAt: number;
    if (targetIdx === -1) {
      // 落在空白处：追加到末尾
      insertAt = order.length;
    } else {
      const target = clips[targetIdx];
      const dropAfter = dropTime >= target.start + target.duration / 2;
      insertAt = Math.max(0, targetIdx + (dropAfter ? 1 : 0));
      // 原数组中位于被移除片段之后的索引需要前移一位
      if (fromIdx < targetIdx) insertAt -= 1;
    }
    order.splice(insertAt, 0, dragClipId);

    // 顺序没变化时不触发 store 更新，避免产生无效历史记录
    const changed = clips.some((c, i) => order[i] !== c.id);
    return changed ? order : null;
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropTime = getDropTime(e);
    // 片段拖拽重排（仅视频轨道）
    const dragClipId = e.dataTransfer.getData('application/x-clip-id');
    if (dragClipId && track.type === 'video') {
      const order = buildReorderIds(dragClipId, dropTime);
      if (order) reorderClips(order);
      return;
    }
    // 素材拖入：读取 dataTransfer 中的 assetId，在放下位置创建新 clip
    const assetId =
      e.dataTransfer.getData('application/x-asset-id') ||
      e.dataTransfer.getData('x-asset-id');
    if (assetId) {
      // addClip 统一落到视频轨道
      addClip(assetId, dropTime);
    }
  };

  return (
    <div
      className={`${styles.track} ${styles[track.type]}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
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
