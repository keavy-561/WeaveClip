import React from 'react';
import { formatTime } from '@/utils/format';
import styles from './index.module.scss';

interface RulerProps {
  duration: number;
  pxPerSec: number;
  onSeek: (time: number) => void;
}

const Ruler: React.FC<RulerProps> = ({ duration, pxPerSec, onSeek }) => {
  // 根据缩放决定刻度间隔：1s / 5s / 10s
  const step = pxPerSec >= 20 ? 1 : pxPerSec >= 8 ? 5 : 10;
  const ticks: number[] = [];
  for (let t = 0; t <= duration; t += step) ticks.push(t);

  return (
    <div
      className={styles.ruler}
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        onSeek(Math.max(0, (e.clientX - rect.left) / pxPerSec));
      }}
    >
      {ticks.map((t) => (
        <div
          key={t}
          className={styles.tick}
          style={{ left: t * pxPerSec }}
        >
          <span className={styles.tickLabel}>{formatTime(t)}</span>
          <span className={styles.tickLine} />
        </div>
      ))}
    </div>
  );
};

export default Ruler;
