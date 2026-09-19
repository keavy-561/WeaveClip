import React, { useEffect, useState } from 'react';
import { Button } from '@douyinfe/semi-ui';
import { IconTick } from '@douyinfe/semi-icons';
import { mockAnalyzeResult } from '@/utils/mockData';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import styles from './index.module.scss';

export interface AnalyzeControlledState {
  /** 已完成的分析步骤数（0-5） */
  doneSteps: number;
  completed: boolean;
}

interface AnalyzeProgressProps {
  /** 提供时在完成后渲染「继续」按钮（不再自动 1.2s 跳转，WO5-13） */
  onComplete?: () => void;
  /** 受控模式：由真实分析引擎驱动进度；缺省时本地自动模拟 */
  controlled?: AnalyzeControlledState;
}

const STEP_TOTAL = 5;

const AnalyzeProgress: React.FC<AnalyzeProgressProps> = ({ onComplete, controlled }) => {
  const { t } = useAppTranslation();
  const [autoDone, setAutoDone] = useState(0);

  // 本地模拟：每 600ms 完成一步（仅非受控模式）
  useEffect(() => {
    if (controlled) return;
    const timer = setInterval(() => {
      setAutoDone((done) => {
        if (done >= STEP_TOTAL) {
          clearInterval(timer);
          return done;
        }
        return done + 1;
      });
    }, 600);
    return () => clearInterval(timer);
  }, [controlled]);

  const doneSteps = controlled ? controlled.doneSteps : autoDone;
  const allDone = controlled ? controlled.completed : autoDone >= STEP_TOTAL;

  const summary = mockAnalyzeResult.summary;
  const labels = [
    t('create.analyzeProgress.clipsAnalyzed'),
    t('create.analyzeProgress.speakersDetected'),
    t('create.analyzeProgress.transcriptGenerated'),
    t('create.analyzeProgress.scenesIdentified'),
    t('create.analyzeProgress.bestMomentsFound'),
  ];

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>{t('create.analyzeProgress.title')}</h2>

      <div className={styles.checklist}>
        {labels.map((label, index) => {
          const done = index < doneSteps;
          return (
            <div key={label} className={styles.checkItem}>
              <span className={`${styles.checkIcon} ${done ? styles.done : styles.pending}`}>
                {done ? <IconTick /> : <span className={styles.dot} />}
              </span>
              <span className={`${styles.checkLabel} ${done ? styles.labelDone : ''}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {allDone && (
        <div className={styles.result}>
          <p className={styles.readyText}>{t('create.analyzeProgress.ready')}</p>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryNum}>{summary.strongMoments}</span>
              <span className={styles.summaryLabel}>{t('create.analyzeProgress.strongMoments')}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryNum}>{summary.talkingHead}</span>
              <span className={styles.summaryLabel}>{t('create.analyzeProgress.talkingHead')}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryNum}>{summary.bRoll}</span>
              <span className={styles.summaryLabel}>{t('create.analyzeProgress.bRoll')}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryNum}>{summary.duplicates}</span>
              <span className={styles.summaryLabel}>{t('create.analyzeProgress.duplicateScenes')}</span>
            </div>
          </div>
          {onComplete && (
            <Button theme="solid" size="large" className={styles.continueBtn} onClick={onComplete}>
              {t('create.analyzeProgress.continue')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default AnalyzeProgress;