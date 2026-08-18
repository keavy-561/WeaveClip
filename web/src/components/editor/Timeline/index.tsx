import React from 'react';
import {
  IconUndo,
  IconRedo,
  IconScissors,
  IconDelete,
  IconImage,
  IconSetting,
} from '@douyinfe/semi-icons';
import { useTimelineStore } from '@/stores/timelineStore';
import { formatTime } from '@/utils/format';
import Track from './Track';
import Ruler from './Ruler';
import Playhead from './Playhead';
import styles from './index.module.scss';

// 每秒对应的像素数（zoom = 1 时）
const PX_PER_SEC = 24;

const Timeline: React.FC = () => {
  const {
    tracks,
    duration,
    zoom,
    currentTime,
    selectedClipId,
    selectClip,
    setCurrentTime,
    setZoom,
    deleteClip,
    splitClip,
  } = useTimelineStore();

  const pxPerSec = PX_PER_SEC * zoom;
  const totalWidth = Math.max(duration * pxPerSec + 120, 600);

  const handleDelete = () => {
    if (selectedClipId) deleteClip(selectedClipId);
  };

  const handleSplit = () => {
    if (!selectedClipId) return;
    const splitPoint = currentTime;
    // 只在选中片段时间范围内切分
    for (const track of tracks) {
      const clip = track.clips.find((c) => c.id === selectedClipId);
      if (!clip) continue;
      if (splitPoint <= clip.start || splitPoint >= clip.start + clip.duration) return;
      splitClip(selectedClipId, splitPoint);
      return;
    }
  };

  return (
    <div className={styles.timeline}>
      {/* 工具头 */}
      <div className={styles.toolHeader}>
        <div className={styles.toolHeaderLeft}>
          <span className={styles.iconBtn} title="Undo"><IconUndo /></span>
          <span className={styles.iconBtn} title="Redo"><IconRedo /></span>
          <span className={styles.divider} />
          <span className={`${styles.iconBtn} ${!selectedClipId ? styles.disabled : ''}`} title="Split" onClick={handleSplit}><IconScissors /></span>
          <span className={`${styles.iconBtn} ${!selectedClipId ? styles.disabled : ''}`} title="Delete" onClick={handleDelete}><IconDelete /></span>
          <span className={styles.iconBtn} title="Add media"><IconImage /></span>
        </div>
        <div className={styles.toolHeaderCenter}>
          <span className={styles.timecodeMain}>{formatTime(currentTime)}</span>
          <span className={styles.timecodeSub}>/ {formatTime(duration)}</span>
        </div>
        <div className={styles.toolHeaderRight}>
          <div className={styles.zoomControls}>
            <button className={styles.iconBtn} onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}>−</button>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.25"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className={styles.zoomSlider}
            />
            <button className={styles.iconBtn} onClick={() => setZoom(Math.min(3, zoom + 0.25))}>+</button>
          </div>
          <span className={styles.divider} />
          <span className={styles.iconBtn} title="Settings"><IconSetting /></span>
        </div>
      </div>

      {/* 左侧轨道标签列 */}
      <div className={styles.trackLabels}>
        <div className={styles.rulerSpacer} />
        {tracks.map((track) => (
          <div key={track.id} className={styles.trackLabel}>
            {track.type === 'video' && <span className={`${styles.trackLabelCode} ${styles.video}`}>V1</span>}
            {track.type === 'audio' && <span className={`${styles.trackLabelCode} ${styles.audio}`}>A1</span>}
            <span className={styles.trackDot} />
            <span className={styles.trackLabelText}>
              {track.type === 'video'
                ? 'Video'
                : track.type === 'caption'
                  ? 'Caption'
                  : track.type === 'audio'
                    ? 'Audio'
                    : 'Effect'}
            </span>
          </div>
        ))}
      </div>

      {/* 右侧时间轴滚动区域 */}
      <div
        className={styles.scrollArea}
        onClick={(e) => {
          if (e.target === e.currentTarget) selectClip(null);
        }}
      >
        <div className={styles.canvas} style={{ width: totalWidth }}>
          <Ruler duration={duration} pxPerSec={pxPerSec} onSeek={setCurrentTime} />

          {tracks.map((track) => (
            <Track
              key={track.id}
              track={track}
              pxPerSec={pxPerSec}
              selectedClipId={selectedClipId}
              onSelectClip={selectClip}
            />
          ))}

          <Playhead pxPerSec={pxPerSec} />
        </div>
      </div>
    </div>
  );
};

export default Timeline;
