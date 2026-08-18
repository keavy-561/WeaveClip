import React, { useEffect, useState } from 'react';
import { IconTick } from '@douyinfe/semi-icons';
import { mockAnalyzeResult } from '@/utils/mockData';
import { useTranslation } from 'react-i18next';
import styles from './index.module.scss';

interface AnalyzeProgressProps {
  onComplete: () => void;
}

type CheckItem = {
  label: string;
  done: boolean;
};

const AnalyzeProgress: React.FC<AnalyzeProgressProps> = ({ onComplete }) => {
  const { t } = useTranslation();
  const [steps, setSteps] = useState<CheckItem[]>([
    { label: t('create.analyzeProgress.clipsAnalyzed'), done: false },
    { label: t('create.analyzeProgress.speakersDetected'), done: false },
    { label: t('create.analyzeProgress.transcriptGenerated'), done: false },
    { label: t('create.analyzeProgress.scenesIdentified'), done: false },
    { label: t('create.analyzeProgress.bestMomentsFound'), done: false },
  ]);
  const [allDone, setAllDone] = useState(false);

  // Mock 分析流程：每 600ms 完成一步
  useEffect(() => {
    let step = 0;
    const timer = setInterval(() => {
      step += 1;
      setSteps((prev) =>
        prev.map((s, i) => (i < step ? { ...s, done: true } : s))
      );
      if (step >= steps.length) {
        clearInterval(timer);
        setAllDone(true);
      }
    }, 600);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (allDone) {
      const t = setTimeout(onComplete, 1200);
      return () => clearTimeout(t);
    }
  }, [allDone, onComplete]);

  const summary = mockAnalyzeResult.summary;

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>{t('create.analyzeProgress.title')}</h2>

      <div className={styles.checklist}>
        {steps.map((step) => (
          <div key={step.label} className={styles.checkItem}>
            <span
              className={`${styles.checkIcon} ${step.done ? styles.done : styles.pending}`}
            >
              {step.done ? <IconTick /> : <span className={styles.dot} />}
            </span>
            <span
              className={`${styles.checkLabel} ${step.done ? styles.labelDone : ''}`}
            >
              {step.done ? step.label : t('create.analyzeProgress.ready')}
            </span>
          </div>
        ))}
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
        </div>
      )}
    </div>
  );
};

export default AnalyzeProgress;
