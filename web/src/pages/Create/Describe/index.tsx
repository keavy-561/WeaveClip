import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Button, Toast } from '@douyinfe/semi-ui';
import { IconArrowLeft } from '@douyinfe/semi-icons';
import Logo from '@/components/ui/Logo';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { useMutation } from '@tanstack/react-query';
import { projectService } from '@/services/projectService';
import DescribeForm from '@/components/create/DescribeForm';
import type { DescribeFormValues } from '@/components/create/DescribeForm';
import { updateMockProject, addMockProject } from '@/utils/mockData';
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

  useEffect(() => {
    const queryPrompt = searchParams.get('prompt');
    const statePrompt = (location.state as { draft?: { prompt?: string } } | null)?.draft?.prompt;
    const prefill = queryPrompt || statePrompt || '';
    setValues((prev) => ({ ...prev, prompt: prefill }));
  }, [searchParams, location.state]);

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

  // 无 projectId（模板直入）时先创建项目再继续生成（工单 WO9-03）
  const createMutation = useMutation({
    mutationFn: (payload: ProjectPayload) => projectService.create(payload),
    onError: () => {
      Toast.error(t('create.describe.error', 'Failed to create project'));
      setIsGenerating(false);
    },
  });

  const handleReset = () => {
    setValues({ prompt: '', duration: 45, format: '9:16', style: 'energetic' });
    setErrors({});
  };

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

    // 无 projectId（模板直入，工单 WO9-03）：先创建项目再走完整生成链路。
    // 真实模式下项目尚无素材时 Generate API 会明确报错提示先上传素材——失败是诚实的
    if (!projectId) {
      if (isMockMode) {
        const id = `proj_${Date.now()}`;
        const now = new Date().toISOString();
        addMockProject({
          id,
          name: payload.name,
          status: 'generating',
          duration: payload.duration ?? null,
          aspectRatio: payload.aspectRatio,
          style: payload.style,
          createdAt: now,
          updatedAt: now,
        });
        navigate(`/projects/new/generate?projectId=${id}`, {
          state: { draft: { prompt: values.prompt } },
        });
        return;
      }
      createMutation.mutate(payload, {
        onSuccess: (project) => {
          navigate(`/projects/new/generate?projectId=${project.id}`, {
            state: { draft: { prompt: values.prompt } },
          });
        },
      });
      return;
    }

    // mock 模式：直接更新本地项目并进入编辑器
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

    // 真实模式：保存项目资料后进入 AI 生成步骤（工单 F08，D5 裁定）
    updateMutation.mutate(payload, {
      onSuccess: () => navigate(`/projects/new/generate?projectId=${projectId}`, {
        state: { draft: { prompt: values.prompt } },
      }),
    });
  };

  // Ctrl/Cmd+Enter 快捷生成（工单 WO9-03）
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleGenerate();
    }
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

      <main className={styles.main} onKeyDown={handleKeyDown}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{t('create.describe.title', 'What should we make?')}</h1>
          <Button theme="borderless" size="small" className={styles.resetBtn} onClick={handleReset}>
            {t('common.reset')}
          </Button>
        </div>
        {!projectId && (
          <div className={styles.uploadGuide}>
            <span className={styles.uploadGuideText}>
              {t('create.describe.needUpload', 'Please upload your footage first')}
            </span>
            <Button
              theme="solid"
              onClick={() => navigate('/projects/new')}
            >
              {t('create.describe.goUpload', 'Upload footage first')}
            </Button>
          </div>
        )}
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
