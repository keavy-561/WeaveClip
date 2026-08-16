import React, { useEffect, useState } from 'react';
import { IconTick, IconClose } from '@douyinfe/semi-icons';
import { mockAnalyzeResult } from '@/utils/mockData';
import styles from './index.module.scss';

interface AnalyzeProgressProps {
  onComplete: () => void;
}

type CheckItem = {
  label: string;
  done: boolean;
};

const AnalyzeProgress: React.FC<AnalyzeProgressProps> = ({ onComplete }) => {
  const [steps, setSteps] = useState<CheckItem[]>([
    { label: 'Clips analyzed', done: false },
    { label: 'Speakers detected', done: false },
    { label: 'Transcript generated', done: false },
    { label: 'Scenes identified', done: false },
    { label: 'Best moments found', done: false },
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
      <h2 className={styles.title}>Understanding your footage...</h2>

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
              {step.done ? step.label : 'Analyzing...'}
            </span>
          </div>
        ))}
      </div>

      {allDone && (
        <div className={styles.result}>
          <p className={styles.readyText}>Your footage is ready.</p>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryNum}>{summary.strongMoments}</span>
              <span className={styles.summaryLabel}>strong moments</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryNum}>{summary.talkingHead}</span>
              <span className={styles.summaryLabel}>talking-head clips</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryNum}>{summary.bRoll}</span>
              <span className={styles.summaryLabel}>B-roll clips</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryNum}>{summary.duplicates}</span>
              <span className={styles.summaryLabel}>duplicate scenes</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyzeProgress;
