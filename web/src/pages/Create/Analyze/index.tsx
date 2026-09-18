import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { Button } from '@douyinfe/semi-ui';
import { IconArrowLeft } from '@douyinfe/semi-icons';
import Logo from '@/components/ui/Logo';
import AnalyzeProgress, { AnalyzeControlledState } from '@/components/create/AnalyzeProgress';
import { analyzeService } from '@/services/assetService';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { useQuery } from '@tanstack/react-query';
import styles from './index.module.scss';

const isMockMode = import.meta.env.VITE_API_MODE === 'mock';

const STEP_TOTAL = 5;

const stepFromProgress = (progress?: number): number => {
  const p = progress ?? 0;
  return Math.min(STEP_TOTAL, Math.max(0, Math.floor(p / 20)));
};

const Analyze: React.FC = () => {
  const { t } = useAppTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');

  const [started, setStarted] = useState(false);
  const [degraded, setDegraded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [controlled, setControlled] = useState<AnalyzeControlledState>({
    doneSteps: 0,
    completed: false,
  });

  // 真实模式：发起分析任务；后端未就绪（接口不可用）时降级为本地模拟
  useEffect(() => {
    if (isMockMode || degraded || !projectId || started) return;
    setStarted(true);
    analyzeService.start(projectId, []).catch(() => {
      setDegraded(true);
    });
  }, [isMockMode, degraded, projectId, started]);

  const statusQuery = useQuery({
    queryKey: ['analysis-status', projectId, retryKey],
    queryFn: () => analyzeService.status(projectId ?? ''),
    enabled: !isMockMode && !degraded && started && !failed && Boolean(projectId),
    refetchInterval: 1200,
  });

  // 轮询结果驱动受控进度
  useEffect(() => {
    const st = statusQuery.data;
    if (!st) return;
    if (st.status === 'failed') {
      setFailed(true);
      return;
    }
    if (st.status === 'completed') {
      setControlled({ doneSteps: STEP_TOTAL, completed: true });
      return;
    }
    setControlled({ doneSteps: stepFromProgress(st.progress), completed: false });
  }, [statusQuery.data]);

  // 状态接口不可用 => 降级为本地模拟
  useEffect(() => {
    if (statusQuery.isError && !degraded) {
      setDegraded(true);
    }
  }, [statusQuery.isError, degraded]);

  const handleRetry = () => {
    setStarted(false);
    setDegraded(false);
    setFailed(false);
    setControlled({ doneSteps: 0, completed: false });
    setRetryKey((key) => key + 1);
  };

  const handleComplete = () => {
    if (!projectId) return;
    navigate(`/projects/new/describe?projectId=${projectId}`);
  };

  if (!projectId) {
    return <Navigate to="/projects/new" replace />;
  }

  const showLocalSimulation = isMockMode || degraded;

  return (
    <div className={styles.page}>
      <header className={styles.navbar}>
        <div className={styles.navLeft}>
          <Button
            icon={<IconArrowLeft />}
            theme="borderless"
            className={styles.backBtn}
            onClick={() => navigate('/projects/new')}
          />
          <Logo size="small" />
        </div>
        <div className={styles.steps}>
          <span className={`${styles.step} ${styles.active}`}>1 {t('create.upload.step', 'Upload')}</span>
          <span className={styles.stepDivider}>—</span>
          <span className={styles.step}>2 {t('create.describe.step', 'Describe')}</span>
          <span className={styles.stepDivider}>—</span>
          <span className={styles.step}>3 {t('create.generate.step', 'Generate')}</span>
        </div>
        <div className={styles.navRight} />
      </header>

      <main className={styles.main}>
        <h1 className={styles.title}>{t('create.analyzeProgress.title', 'Understanding your footage...')}</h1>

        {degraded && (
          <div className={styles.notice}>{t('create.analyze.degradedTip', 'Analysis service unavailable, using local preview')}</div>
        )}

        {failed ? (
          <div className={styles.failedBox}>
            <p className={styles.failedText}>{t('create.analyze.failedTitle', 'Analysis failed')}</p>
            <Button
              theme="solid"
              size="large"
              className={styles.retryBtn}
              onClick={handleRetry}
            >
              {t('create.analyze.retry', 'Retry')}
            </Button>
          </div>
        ) : (
          <AnalyzeProgress
            onComplete={handleComplete}
            controlled={showLocalSimulation ? undefined : controlled}
          />
        )}
      </main>
    </div>
  );
};

export default Analyze;