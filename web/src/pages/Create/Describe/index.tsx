import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Button, RadioGroup, Radio, TextArea, Form } from '@douyinfe/semi-ui';
import { IconArrowLeft, IconSend } from '@douyinfe/semi-icons';
import Logo from '@/components/ui/Logo';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { useTranslation } from 'react-i18next';
import { addMockProject } from '@/utils/mockData';
import styles from './index.module.scss';

interface StyleOption {
  value: string;
  labelKey: string;
}

const STYLE_OPTIONS: StyleOption[] = [
  { value: 'cinematic', labelKey: 'create.describe.styleCinematic' },
  { value: 'energetic', labelKey: 'create.describe.styleEnergetic' },
  { value: 'minimal', labelKey: 'create.describe.styleMinimal' },
  { value: 'storytelling', labelKey: 'create.describe.styleStorytelling' },
];

const Describe: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(45);
  const [format, setFormat] = useState('9:16');
  const [style, setStyle] = useState('energetic');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errors, setErrors] = useState<{ prompt?: string }>({});

  // Priority: query param > state.draft.prompt
  useEffect(() => {
    const queryPrompt = searchParams.get('prompt');
    const statePrompt = (location.state as { draft?: { prompt?: string } } | null)?.draft?.prompt;
    const prefill = queryPrompt || statePrompt || '';
    setPrompt(prefill);
  }, [searchParams, location.state]);

  const validate = (): boolean => {
    const newErrors: { prompt?: string } = {};
    if (!prompt.trim()) {
      newErrors.prompt = t('create.describe.error.required', 'Please describe what you want');
    } else if (prompt.trim().length < 5) {
      newErrors.prompt = t('create.describe.error.minLength', 'At least 5 characters');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGenerate = () => {
    if (!validate()) return;

    setIsGenerating(true);
    // Mock generate: create project and navigate to editor
    setTimeout(() => {
      const projectId = `proj_${Date.now()}`;
      addMockProject({
        id: projectId,
        name: prompt.slice(0, 30) || 'Untitled',
        status: 'ready',
        duration,
        aspectRatio: format,
        style,
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

        <div className={styles.form}>
          <Form onSubmit={(_, e) => {
            e?.preventDefault();
            handleGenerate();
          }}>
            <label className={styles.optionLabel}>{t('create.describe.label', 'Describe your video')}</label>
            <TextArea
              value={prompt}
              onChange={(v) => {
                setPrompt(v);
                if (errors.prompt) setErrors({});
              }}
              placeholder={t('create.describe.placeholder', 'e.g. "Create a 45-second travel vlog..."')}
              rows={4}
              maxCount={500}
              className={styles.textarea}
              validateStatus={errors.prompt ? 'error' : undefined}
              autosize
            />
            {errors.prompt && <span className={styles.errorText}>{errors.prompt}</span>}

            <div className={styles.optionRow}>
              <div className={styles.optionGroup}>
                <label className={styles.optionLabel}>{t('create.describe.duration', 'Duration')}</label>
                <RadioGroup
                  type="button"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value as number)}
                >
                  <Radio value={15}>15s</Radio>
                  <Radio value={30}>30s</Radio>
                  <Radio value={45}>45s</Radio>
                  <Radio value={60}>60s</Radio>
                </RadioGroup>
              </div>

              <div className={styles.optionGroup}>
                <label className={styles.optionLabel}>{t('create.describe.format', 'Format')}</label>
                <RadioGroup
                  type="button"
                  value={format}
                  onChange={(e) => setFormat(e.target.value as string)}
                >
                  <Radio value="9:16">9:16</Radio>
                  <Radio value="16:9">16:9</Radio>
                  <Radio value="1:1">1:1</Radio>
                </RadioGroup>
              </div>

              <div className={styles.optionGroup}>
                <label className={styles.optionLabel}>{t('create.describe.style', 'Style')}</label>
                <RadioGroup
                  type="button"
                  value={style}
                  onChange={(e) => setStyle(e.target.value as string)}
                >
                  {STYLE_OPTIONS.map((opt) => (
                    <Radio key={opt.value} value={opt.value}>
                      {t(opt.labelKey, opt.value)}
                    </Radio>
                  ))}
                </RadioGroup>
              </div>
            </div>

            <div className={styles.actions}>
              <Button
                theme="solid"
                size="large"
                icon={<IconSend />}
                loading={isGenerating}
                onClick={handleGenerate}
                className={styles.generateBtn}
              >
                {isGenerating ? t('create.describe.generating', 'Generating...') : t('create.describe.generate', 'Generate')}
              </Button>
            </div>
          </Form>
        </div>
      </main>
    </div>
  );
};

export default Describe;
