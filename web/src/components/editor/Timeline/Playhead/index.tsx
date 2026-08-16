import React, { useCallback } from 'react';
import { useTimelineStore } from '@/stores/timelineStore';
import styles from './index.module.scss';

interface PlayheadProps {
  pxPerSec: number;
}

const Playhead: React.FC<PlayheadProps> = ({ pxPerSec }) => {
  const currentTime = useTimelineStore((s) => s.currentTime);
  const setCurrentTime = useTimelineStore((s) => s.setCurrentTime);

  const startDrag = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      // 先捕获 canvas 元素，避免事件回调中 currentTarget 失效
      const canvas = (e.currentTarget as HTMLElement).closest(
        'div[class*=canvas]'
      ) as HTMLElement | null;
      if (!canvas) return;

      const seek = (clientX: number) => {
        const rect = canvas.getBoundingClientRect();
        setCurrentTime(Math.max(0, (clientX - rect.left) / pxPerSec));
      };

      const onMove = (ev: MouseEvent) => seek(ev.clientX);
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [pxPerSec, setCurrentTime]
  );

  return (
    <div
      className={styles.playhead}
      style={{ left: currentTime * pxPerSec }}
      onMouseDown={startDrag}
      onClick={(e) => e.stopPropagation()}
    >
      <span className={styles.head} />
      <span className={styles.line} />
    </div>
  );
};

export default Playhead;
