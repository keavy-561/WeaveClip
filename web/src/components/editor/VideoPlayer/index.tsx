import React, { useState, useEffect } from 'react';
import { Button } from '@douyinfe/semi-ui';
import { IconPlay, IconPause, IconMute, IconVolume2 } from '@douyinfe/semi-icons';
import { useTimelineStore } from '@/stores/timelineStore';
import { useTranslation } from 'react-i18next';
import { formatTime } from '@/utils/format';
import styles from './index.module.scss';

const VideoPlayer: React.FC = () => {
  const { isPlaying, togglePlay, currentTime, duration, setCurrentTime } =
    useTimelineStore();
  const { t } = useTranslation();
  const [muted, setMuted] = useState(false);

  useEffect(() => {
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
        <img
          className={styles.previewImage}
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuB5JApBOE5ibho-CY0MmltucxXxPsymmJ6TbumNUrcbSQzXrrZp5S_P6IIWygvuAlf9vDdLscZo8bsbvzB-hRab_TmD4YficAjetaLisUEdrNMKJDJW0t_wLF4PbeqjVtXPnCRN8UTKyPKzdw8Hy6Hahq5KUDhOW3MzoayX5MYg16-q0WB-KKycLfYgOkPyM_L-YDsIE1eCxZvcal4h9K4m-yMqE6tpqmghg9eEcoA71q8ka_DX_SOF9d9TiL9tvoq4yuQ"
          alt="Video preview"
        />
        <div className={styles.mockTime}>{formatTime(currentTime)}</div>

        <div className={styles.overlay}>
          <div className={styles.controls}>
            <Button
              icon={isPlaying ? <IconPause /> : <IconPlay />}
              theme="borderless"
              size="small"
              onClick={togglePlay}
              aria-label={isPlaying ? t('editor.videoPlayer.pause') : t('editor.videoPlayer.play')}
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
              aria-label={muted ? t('editor.videoPlayer.unmute') : t('editor.videoPlayer.mute')}
              className={styles.controlBtn}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
