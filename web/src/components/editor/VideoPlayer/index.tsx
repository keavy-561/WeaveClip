import React from 'react';
import { Button } from '@douyinfe/semi-ui';
import { IconPlay, IconPause, IconMute, IconVolume2 } from '@douyinfe/semi-icons';
import { useTimelineStore } from '@/stores/timelineStore';
import { formatTime } from '@/utils/format';
import styles from './index.module.scss';

const VideoPlayer: React.FC = () => {
  const { isPlaying, togglePlay, currentTime, duration, setCurrentTime } =
    useTimelineStore();
  const [muted, setMuted] = React.useState(false);

  React.useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      const next = currentTime + 0.1;
      if (next >= duration) {
        setCurrentTime(0);
        togglePlay();
      } else {
        setCurrentTime(next);
      }
    }, 100);
    return () => clearInterval(timer);
  }, [isPlaying, currentTime, duration, setCurrentTime, togglePlay]);

  return (
    <div className={styles.player}>
      <div className={styles.screen}>
        <div className={styles.mockFrame}>
          <div className={styles.mockContent}>
            <div className={styles.mockIcon}>▶</div>
            <span className={styles.mockLabel}>Preview</span>
          </div>
          <span className={styles.mockTime}>{formatTime(currentTime)}</span>
        </div>

        <div className={styles.overlay}>
          <div className={styles.controls}>
            <Button
              icon={isPlaying ? <IconPause /> : <IconPlay />}
              theme="borderless"
              size="small"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className={styles.controlBtn}
            />
            <span className={styles.timeDisplay}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            <Button
              icon={muted ? <IconMute /> : <IconVolume2 />}
              theme="borderless"
              size="small"
              onClick={() => setMuted(!muted)}
              aria-label={muted ? 'Unmute' : 'Mute'}
              className={styles.controlBtn}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
