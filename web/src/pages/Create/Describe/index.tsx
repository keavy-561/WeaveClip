import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Button } from '@douyinfe/semi-ui';
import { IconArrowLeft } from '@douyinfe/semi-icons';
import Logo from '@/components/ui/Logo';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { useTranslation } from 'react-i18next';
import { addMockProject } from '@/utils/mockData';
import DescribeForm from '@/components/create/DescribeForm';
import type { DescribeFormValues } from '@/components/create/DescribeForm';
import styles from './index.module.scss';

const Describe: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
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

  const handleGenerate = () => {
    const newErrors: { prompt?: string } = {};
    if (!values.prompt.trim()) {
      newErrors.prompt = t('create.describe.error.required', 'Please describe what you want');
    } else if (values.prompt.trim().length < 5) {
      newErrors.prompt = t('create.describe.error.minLength', 'At least 5 characters');
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsGenerating(true);
    setTimeout(() => {
      const projectId = `proj_${Date.now()}`;
      addMockProject({
        id: projectId,
        name: values.prompt.slice(0, 30) || 'Untitled',
        status: 'ready',
        duration: values.duration,
        aspectRatio: values.format,
        style: values.style,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        thumbnailUrl: '/src/assets/project-thumb-1.png',
      });
      navigate(`/editor/${projectId}`);
    }, 1500);
  };

  return (
    <div className={styles.page}>
      <header className={styles.navbar}>
        <div className={styles.navLeft}>
          <Button
            icon={<IconArrowLeft />}
            theme="borderless"
            onClick={() => navigate('/projects/new')}
            style={{ color: 'var(--semi-color-text-1)' }}
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
        <div className={styles.navRight}>
          <ThemeToggle />
        </div>
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
