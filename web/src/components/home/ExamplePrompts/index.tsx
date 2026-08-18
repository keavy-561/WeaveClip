import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import styles from './index.module.scss';

export interface ExamplePrompt {
  id: string;
  text: string;
  labelKey?: string;
}

interface ExamplePromptsProps {
  prompts: ExamplePrompt[];
}

const ExamplePrompts: React.FC<ExamplePromptsProps> = ({ prompts }) => {
  const { t } = useAppTranslation();
  const navigate = useNavigate();

  const handleClick = (text: string) => {
    navigate(`/projects/new/describe?prompt=${encodeURIComponent(text)}`);
  };

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>{t('home.examplePromptsTitle', '试试这些')}</h2>
      <div className={styles.list}>
        {prompts.map((item) => (
          <button
            key={item.id}
            type="button"
            className={styles.chip}
            onClick={() => handleClick(item.text)}
          >
            {t(item.labelKey || item.text, item.text)}
          </button>
        ))}
      </div>
    </section>
  );
};

export default ExamplePrompts;
