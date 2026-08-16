import React from 'react';
import { useTimelineStore } from '@/stores/timelineStore';
import Track from './Track';
import Ruler from './Ruler';
import Playhead from './Playhead';
import styles from './index.module.scss';

// 每秒对应的像素数（zoom = 1 时）
const PX_PER_SEC = 24;

const Timeline: React.FC = () => {
  const { tracks, duration, zoom, selectedClipId, selectClip, setCurrentTime } =
    useTimelineStore();

  const pxPerSec = PX_PER_SEC * zoom;
  const totalWidth = Math.max(duration * pxPerSec + 120, 600);

  return (
    <div className={styles.timeline}>
      {/* 左侧轨道标签列 */}
      <div className={styles.trackLabels}>
        <div className={styles.rulerSpacer} />
        {tracks.map((track) => (
          <div key={track.id} className={styles.trackLabel}>
            <span
              className={`${styles.trackDot} ${styles[track.type]}`}
            />
            <span className={styles.trackName}>
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
          // 点击空白处取消选中
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
