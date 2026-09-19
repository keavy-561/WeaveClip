import React from 'react';
import { Button, Empty } from '@douyinfe/semi-ui';
import { useTimelineStore } from '@/stores/timelineStore';
import { useAssetsStore } from '@/stores/assetsStore';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import styles from './index.module.scss';

interface TranscriptSegment {
  start?: number;
  end?: number;
  text?: string;
}

/** Transcript 面板（工单 WO2-02，Phase 4.10）：
 * 展示视频素材的 Whisper 转录分段，点击时间戳跳播 */
const TranscriptPanel: React.FC = () => {
  const { t } = useAppTranslation();
  const assets = useAssetsStore((s) => s.assets);
  const setCurrentTime = useTimelineStore((s) => s.setCurrentTime);

  const withTranscript = assets.filter(
    (a) => a.type === 'video' && a.transcript && Array.isArray((a.transcript as { segments?: unknown }).segments)
  );

  if (withTranscript.length === 0) {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <span className={styles.title}>{t('editor.transcript.title')}</span>
        </div>
        <Empty description={t('editor.transcript.empty')} />
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>{t('editor.transcript.title')}</span>
      </div>
      <div className={styles.segments}>
        {withTranscript.map((asset) => {
          const segments = ((asset.transcript as { segments?: TranscriptSegment[] }).segments) ?? [];
          return (
            <div key={asset.id} className={styles.assetBlock}>
              <div className={styles.assetName}>{asset.fileName}</div>
              {segments.length === 0 ? (
                <div className={styles.noSegments}>{t('editor.transcript.empty')}</div>
              ) : (
                segments.map((seg, i) => (
                  <div key={`${asset.id}-${i}`} className={styles.segment}>
                    <Button
                      theme="borderless"
                      size="small"
                      className={styles.timeBtn}
                      onClick={() => setCurrentTime(Number(seg.start ?? 0))}
                    >
                      {formatTime(Number(seg.start ?? 0))}
                    </Button>
                    <span className={styles.segmentText}>{seg.text ?? ''}</span>
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TranscriptPanel;
