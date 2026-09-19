import React from 'react';
import { TextArea } from '@douyinfe/semi-ui';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import styles from './index.module.scss';

export interface PromptInputProps {
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

/** 描述字数上限 */
const MAX_PROMPT_LENGTH = 500;

const PromptInput: React.FC<PromptInputProps> = ({ value, error, onChange }) => {
  const { t } = useAppTranslation();

  return (
    <div className={styles.promptInput}>
      <label className={styles.label}>{t('create.describe.label', 'Describe your video')}</label>
      <div className={styles.textareaWrap}>
        <TextArea
          value={value}
          onChange={(v) => onChange(v)}
          placeholder={t('create.describe.placeholder', 'e.g. "Create a 45-second travel vlog..."')}
          rows={4}
          // 用原生长度限位替代 maxCount：Semi 内置计数器会把数字拆成多个文本节点，
          // 导致 DOM 中“0/500”看似重复渲染（走查 P1-3）
          maxLength={MAX_PROMPT_LENGTH}
          className={styles.textarea}
          validateStatus={error ? 'error' : undefined}
          autosize
        />
        {/* 单一文本节点计数器，避免 DOM 冗余 */}
        <span className={styles.charCount}>
          {t('create.describe.charCount', { count: value.length })}
        </span>
      </div>
      {error && <span className={styles.errorText}>{error}</span>}
    </div>
  );
};

export default PromptInput;
