import React from 'react';
import { TextArea } from '@douyinfe/semi-ui';
import { useTranslation } from 'react-i18next';
import styles from './index.module.scss';

export interface PromptInputProps {
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

const PromptInput: React.FC<PromptInputProps> = ({ value, error, onChange }) => {
  const { t } = useTranslation();

  return (
    <div className={styles.promptInput}>
      <label className={styles.label}>{t('create.describe.label', 'Describe your video')}</label>
      <TextArea
        value={value}
        onChange={(v) => onChange(v)}
        placeholder={t('create.describe.placeholder', 'e.g. "Create a 45-second travel vlog..."')}
        rows={4}
        maxCount={500}
        className={styles.textarea}
        validateStatus={error ? 'error' : undefined}
        autosize
      />
      {error && <span className={styles.errorText}>{error}</span>}
    </div>
  );
};

export default PromptInput;
