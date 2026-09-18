import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams, useLocation, Navigate } from 'react-router-dom';
import { Button, Toast, Input } from '@douyinfe/semi-ui';
import { IconArrowLeft } from '@douyinfe/semi-icons';
import Logo from '@/components/ui/Logo';
import AnalyzeProgress, { AnalyzeControlledState } from '@/components/create/AnalyzeProgress';
import { generateService } from '@/services/generateService';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import styles from './index.module.scss';

const isMockMode = import.meta.env.VITE_API_MODE === 'mock';

/** 生成阶段轮询页（工单 F08，对应后端 Generate API B12）：
 * parsing → planning → generating → completed；need_input 时渲染追问表单 */
const Generate: React.FC = () => {
  const { t } = useAppTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const projectId = searchParams.get('projectId');
  const draft = (location.state as { draft?: { prompt?: string } } | null)?.draft?.prompt
    ?? searchParams.get('prompt')
    ?? '';

  const [generationId, setGenerationId] = useState<string | null>(null);
  const [controlled, setControlled] = useState<AnalyzeControlledState>({ doneSteps: 0, completed: false });
  const [failed, setFailed] = useState(false);
  const [needInput, setNeedInput] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const startedRef = useRef(false);

  // 进入页面即启动生成（真实模式）
  useEffect(() => {
    if (isMockMode || startedRef.current || !projectId || !draft) return;
    startedRef.current = true;
    generateService.start(projectId, { prompt: draft })
      .then((resp) => setGenerationId(resp.generationId))
      .catch(() => {
        setFailed(true);
        Toast.error(t('create.generate.startFailed', 'Failed to start generation'));
      });
  }, [projectId, draft, t]);

  // 轮询生成状态
  useEffect(() => {
    if (!generationId || isMockMode) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const resp = await generateService.status(generationId);
        if (cancelled) return;
        if (resp.status === 'completed') {
          setControlled({ doneSteps: 4, completed: true });
          return;
        }
        if (resp.status === 'need_input') {
          setNeedInput(resp.questions ?? []);
          return;
        }
        if (resp.status === 'failed') {
          setFailed(true);
          Toast.error(resp.error ?? t('create.generate.failed', 'Generation failed'));
          return;
        }
        // processing：按阶段推进
        setControlled((prev) => ({ doneSteps: Math.min(prev.doneSteps + 1, 3), completed: false }));
        window.setTimeout(tick, 1200);
      } catch {
        if (!cancelled) {
          window.setTimeout(tick, 2000);
        }
      }
    };
    window.setTimeout(tick, 800);
    return () => { cancelled = true; };
  }, [generationId, t]);

  const handleSubmitAnswers = () => {
    if (!projectId || !draft) return;
    const payload = draft && needInput.length > 0
      ? { prompt: draft, answers: needInput.map((q, i) => ({ question: q, answer: answers[i] ?? '' })) }
      : { prompt: draft };
    setNeedInput([]);
    setControlled({ doneSteps: 0, completed: false });
    generateService.start(projectId, payload)
      .then((resp) => {
        setGenerationId(resp.generationId);
      })
      .catch(() => Toast.error(t('create.generate.startFailed', 'Failed to start generation')));
  };

  const handleComplete = () => {
    if (!projectId) return;
    navigate(`/editor/${projectId}`, { state: { regenerated: true } });
  };

  if (!projectId) {
    return <Navigate to="/projects/new" replace />;
  }

  return (
    <div className={styles.page}>
      <header className={styles.navbar}>
        <div className={styles.navLeft}>
          <Button
            icon={<IconArrowLeft />}
            theme="borderless"
            className={styles.backBtn}
            onClick={() => navigate(-1)}
          />
          <Logo size="small" />
        </div>
        <div className={styles.steps}>
          <span className={styles.step}>1 {t('create.upload.step', 'Upload')}</span>
          <span className={styles.stepDivider}>—</span>
          <span className={styles.step}>2 {t('create.describe.step', 'Describe')}</span>
          <span className={styles.stepDivider}>—</span>
          <span className={`${styles.step} ${styles.active}`}>3 {t('create.generate.step', 'Generate')}</span>
        </div>
        <div className={styles.navRight} />
      </header>

      <main className={styles.main}>
        <h1 className={styles.title}>{t('create.generate.title', 'AI is crafting your timeline...')}</h1>

        {needInput.length > 0 ? (
          <div className={styles.clarify}>
            <p className={styles.clarifyTitle}>{t('create.generate.needInput', 'A few questions to nail your cut:')}</p>
            {needInput.map((q, i) => (
              <label key={q} className={styles.clarifyItem}>
                <span>{q}</span>
                <Input
                  className={styles.clarifyInput}
                  value={answers[i] ?? ''}
                  onChange={(value) => {
                    const next = [...answers];
                    next[i] = value;
                    setAnswers(next);
                  }}
                />
              </label>
            ))}
            <Button theme="solid" onClick={handleSubmitAnswers}>
              {t('create.generate.submitAnswers', 'Continue generating')}
            </Button>
          </div>
        ) : (
          <>
            <AnalyzeProgress controlled={controlled} onComplete={() => {}} />
            {failed && (
              <Button theme="solid" className={styles.retryBtn} onClick={() => navigate(-1)}>
                {t('common.back')}
              </Button>
            )}
            {controlled.completed && (
              <Button theme="solid" size="large" className={styles.retryBtn} onClick={handleComplete}>
                {t('create.generate.openEditor', 'Open editor')}
              </Button>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Generate;
