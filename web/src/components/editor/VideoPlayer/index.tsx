import React from 'react';
import { Button, Slider } from '@douyinfe/semi-ui';
import { IconPlay, IconPause, IconVolume2, IconMute } from '@douyinfe/semi-icons';
import { useTimelineStore } from '@/stores/timelineStore';
import { formatTime } from '@/utils/format';
import styles from './index.module.scss';

const VideoPlayer: React.FC = () => {
  const { isPlaying, togglePlay, currentTime, duration, setCurrentTime } =
    useTimelineStore();
  const [muted, setMuted] = React.useState(false);

  // Phase 0: Mock 播放——播放时每 100ms 推进时间
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
      {/* 预览画面（Mock 占位） */}
      <div
        className={styles.screen}
        onClick={togglePlay}
        style={{ aspectRatio: '9/16', maxHeight: '100%' }}
      >
        <div className={styles.mockFrame}>
          <span className={styles.mockLabel}>Preview</span>
          <span className={styles.mockTime}>{formatTime(currentTime)}</span>
        </div>
      </div>

      {/* 控制条 */}
      <div className={styles.controls}>
        <Button
          icon={isPlaying ? <IconPause /> : <IconPlay />}
          theme="borderless"
          size="small"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          style={{ color: 'var(--semi-color-text-0)' }}
        />

        <span className={styles.timeDisplay}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        <div className={styles.progressWrap}>
          <Slider
            value={(currentTime / duration) * 100}
            onChange={(v) => setCurrentTime(((v as number) / 100) * duration)}
            tooltipVisible={false}
            className={styles.slider}
          />
        </div>

        <Button
          icon={muted ? <IconMute /> : <IconVolume2 />}
          theme="borderless"
          size="small"
          onClick={() => setMuted(!muted)}
          aria-label={muted ? 'Unmute' : 'Mute'}
          style={{ color: 'var(--semi-color-text-1)' }}
        />
      </div>
    </div>
  );
};

export default VideoPlayer;
