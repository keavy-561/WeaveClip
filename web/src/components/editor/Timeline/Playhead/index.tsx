import React, { useCallback } from 'react';
import { useTimelineStore } from '@/stores/timelineStore';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import styles from './index.module.scss';

interface PlayheadProps {
  pxPerSec: number;
  /** Timeline 传入的画布引用：替代类名字符串匹配的脆弱定位（工单 WO9-06） */
  canvasRef?: React.RefObject<HTMLDivElement | null>;
}

const Playhead: React.FC<PlayheadProps> = ({ pxPerSec, canvasRef }) => {
  const currentTime = useTimelineStore((s) => s.currentTime);
  const setCurrentTime = useTimelineStore((s) => s.setCurrentTime);
  const { t } = useAppTranslation();

  const startDrag = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      // 优先使用画布 ref，事件回调中也可安全取用
      const canvas =
        canvasRef?.current ??
        ((e.currentTarget as HTMLElement).closest('div[class*=canvas]') as HTMLElement | null);
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
    [canvasRef, pxPerSec, setCurrentTime]
  );

  return (
    <div
      className={styles.playhead}
      style={{ left: currentTime * pxPerSec }}
      onMouseDown={startDrag}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        // 键盘微调：←/→ ±0.5s，Shift 加速 ±1s（工单 WO9-06）
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault();
          e.stopPropagation();
          const step = e.shiftKey ? 1 : 0.5;
          setCurrentTime(Math.max(0, currentTime + (e.key === 'ArrowLeft' ? -step : step)));
        }
      }}
      role="slider"
      aria-label={t('editor.timeline.playhead')}
      aria-valuemin={0}
      aria-valuenow={Math.round(currentTime * 10) / 10}
      tabIndex={0}
    >
      <span className={styles.head} />
      <span className={styles.line} />
    </div>
  );
};

export default Playhead;
