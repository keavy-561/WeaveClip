import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Radio, RadioGroup, TextArea, Toast } from '@douyinfe/semi-ui';
import { IconArrowLeft, IconSend } from '@douyinfe/semi-icons';
import Logo from '@/components/ui/Logo';
import ThemeToggle from '@/components/ui/ThemeToggle';
import styles from './index.module.scss';

const EXAMPLE_PROMPTS = [
  'Create a 45-second travel vlog about my NYC trip. Make it energetic and cinematic. Focus on Times Square and Central Park.',
  'Turn my interview footage into a 60s TikTok with captions.',
  'Make a 30s product teaser with a strong hook.',
];

const Describe: React.FC = () => {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(45);
  const [format, setFormat] = useState('9:16');
  const [style, setStyle] = useState('energetic');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    if (!prompt.trim()) {
      Toast.warning('Please describe what you want to create.');
      return;
    }
    setIsGenerating(true);
    // Phase 0: Mock 生成，1.5s 后跳转 Editor
    setTimeout(() => {
      navigate('/editor/proj_new');
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
          <span className={styles.step}>1 Upload</span>
          <span className={styles.stepDivider}>—</span>
          <span className={`${styles.step} ${styles.active}`}>2 Describe</span>
          <span className={styles.stepDivider}>—</span>
          <span className={styles.step}>3 Generate</span>
        </div>
        <div className={styles.navRight}>
          <ThemeToggle />
        </div>
      </header>

      <main className={styles.main}>
        <h1 className={styles.title}>What should we make?</h1>

        <div className={styles.form}>
          <label className={styles.label}>Describe your video</label>
          <TextArea
            value={prompt}
            onChange={(v) => setPrompt(v)}
            placeholder='e.g. "Create a 45-second travel vlog about my NYC trip..."'
            rows={4}
            maxCount={500}
            className={styles.textarea}
          />

          <div className={styles.examples}>
            <span className={styles.examplesLabel}>Examples:</span>
            {EXAMPLE_PROMPTS.map((p) => (
              <button
                key={p}
                className={styles.exampleItem}
                onClick={() => setPrompt(p)}
              >
                "{p.length > 60 ? p.slice(0, 60) + '...' : p}"
              </button>
            ))}
          </div>

          <div className={styles.optionRow}>
            <div className={styles.optionGroup}>
              <label className={styles.label}>Duration</label>
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
              <label className={styles.label}>Format</label>
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
              <label className={styles.label}>Style</label>
              <RadioGroup
                type="button"
                value={style}
                onChange={(e) => setStyle(e.target.value as string)}
              >
                <Radio value="cinematic">Cinematic</Radio>
                <Radio value="energetic">Energetic</Radio>
                <Radio value="minimal">Minimal</Radio>
                <Radio value="storytelling">Storytelling</Radio>
              </RadioGroup>
            </div>
          </div>

          <Button
            theme="solid"
            size="large"
            icon={<IconSend />}
            loading={isGenerating}
            onClick={handleGenerate}
            className={styles.generateBtn}
          >
            {isGenerating ? 'Generating...' : 'Generate'}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Describe;
