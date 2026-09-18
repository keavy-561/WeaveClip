import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Button, Toast } from '@douyinfe/semi-ui';
import { IconArrowLeft } from '@douyinfe/semi-icons';
import Logo from '@/components/ui/Logo';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { useMutation } from '@tanstack/react-query';
import { projectService } from '@/services/projectService';
import DescribeForm from '@/components/create/DescribeForm';
import type { DescribeFormValues } from '@/components/create/DescribeForm';
import { addMockProject, updateMockProject } from '@/utils/mockData';
import styles from './index.module.scss';

const isMockMode = import.meta.env.VITE_API_MODE === 'mock';

type ProjectPayload = { name: string; duration?: number; aspectRatio?: string; style?: string };

const Describe: React.FC = () => {
  const { t } = useAppTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const projectId = searchParams.get('projectId');
  const [values, setValues] = useState<DescribeFormValues>({
    prompt: '',
    duration: 45,
    format: '9:16',
    style: 'energetic',
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [errors, setErrors] = useState<{ prompt?: string }>({});
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const queryPrompt = searchParams.get('prompt');
    const statePrompt = (location.state as { draft?: { prompt?: string } } | null)?.draft?.prompt;
    const prefill = queryPrompt || statePrompt || '';
    setValues((prev) => ({ ...prev, prompt: prefill }));
  }, [searchParams, location.state]);

  const createMutation = useMutation({
    mutationFn: (payload: ProjectPayload) => projectService.create(payload),
    onSuccess: (project) => {
      navigate(`/editor/${project.id}`);
    },
    onError: () => {
      Toast.error(t('create.describe.error', 'Failed to create project'));
      setIsGenerating(false);
    },
  });

  // 从分析页进入时更新已创建的项目（描述阶段提交即保存项目资料）
  const updateMutation = useMutation({
    mutationFn: (payload: ProjectPayload) => projectService.update(projectId ?? '', payload),
    onSuccess: () => {
      navigate(`/editor/${projectId}`);
    },
    onError: () => {
      Toast.error(t('create.describe.error', 'Failed to create project'));
      setIsGenerating(false);
    },
  });

  const handleGenerate = () => {
    const newErrors: { prompt?: string } = {};
    if (!values.prompt.trim()) {
      newErrors.prompt = t('create.describe.validation.required', 'Please describe what you want');
    } else if (values.prompt.trim().length < 5) {
      newErrors.prompt = t('create.describe.validation.minLength', 'At least 5 characters');
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsGenerating(true);
    const payload: ProjectPayload = {
      name: values.prompt.trim().slice(0, 30) || 'Untitled',
      duration: values.duration,
      aspectRatio: values.format,
      style: values.style,
    };

    // 从分析页进入：更新已创建的项目，避免产生重复项目
    if (projectId) {
      if (isMockMode) {
        const updated = updateMockProject(projectId, { ...payload, status: 'ready' });
        if (!updated) {
          Toast.error(t('create.describe.error', 'Failed to create project'));
          setIsGenerating(false);
          return;
        }
        navigate(`/editor/${projectId}`);
        return;
      }
      updateMutation.mutate(payload);
      return;
    }

    // 直达描述页（如模板卡片）：沿用本地创建流程
    if (isMockMode) {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(() => {
        const newProjectId = `proj_${Date.now()}`;
        addMockProject({
          id: newProjectId,
          name: payload.name ?? 'Untitled',
          status: 'ready',
          duration: payload.duration ?? null,
          aspectRatio: payload.aspectRatio ?? '9:16',
          style: payload.style ?? 'energetic',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          thumbnailUrl: '/src/assets/project-thumb-1.png',
        });
        navigate(`/editor/${newProjectId}`);
        timerRef.current = null;
      }, 1500);
      return;
    }

    createMutation.mutate(payload);
  };

  return (
    <div className={styles.page}>
      <header className={styles.navbar}>
        <div className={styles.navLeft}>
          <Button
            icon={<IconArrowLeft />}
            theme="borderless"
            className={styles.backBtn}
            onClick={() => (projectId ? navigate(-1) : navigate('/projects/new'))}
          />
          <Logo size="small" />
        </div>
        <div className={styles.steps}>
          <span className={styles.step}>1 {t('create.upload.step', 'Upload')}</span>
          <span className={styles.stepDivider}>—</span>
          <span className={`${styles.step} ${styles.active}`}>2 {t('create.describe.step', 'Describe')}</span>
          <span className={styles.stepDivider}>—</span>
          <span className={styles.step}>3 {t('create.generate.step', 'Generate')}</span>
        </div>
        <div className={styles.navRight} />
      </header>

      <main className={styles.main}>
        <h1 className={styles.title}>{t('create.describe.title', 'What should we make?')}</h1>
        <DescribeForm
          values={values}
          errors={errors}
          isGenerating={isGenerating}
          onChange={setValues}
          onGenerate={handleGenerate}
        />
      </main>
    </div>
  );
};

export default Describe;
