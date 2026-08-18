import React from 'react';
import { Button } from '@douyinfe/semi-ui';
import { IconSend } from '@douyinfe/semi-icons';
import PromptInput from '../PromptInput';
import OptionGroup from '../OptionGroup';
import StylePicker from '../StylePicker';
import { useTranslation } from 'react-i18next';
import styles from './index.module.scss';

export interface DescribeFormValues {
  prompt: string;
  duration: number;
  format: string;
  style: string;
}

export interface DescribeFormProps {
  values: DescribeFormValues;
  errors: { prompt?: string };
  isGenerating: boolean;
  onChange: (values: DescribeFormValues) => void;
  onGenerate: () => void;
}

const DescribeForm: React.FC<DescribeFormProps> = ({
  values,
  errors,
  isGenerating,
  onChange,
  onGenerate,
}) => {
  const { t } = useTranslation();

  return (
    <div className={styles.form}>
      <PromptInput
        value={values.prompt}
        error={errors.prompt}
        onChange={(prompt) => onChange({ ...values, prompt })}
      />

      <div className={styles.optionRow}>
        <OptionGroup
          label="create.describe.duration"
          value={values.duration}
          options={[
            { value: 15, label: '15s' },
            { value: 30, label: '30s' },
            { value: 45, label: '45s' },
            { value: 60, label: '60s' },
          ]}
          onChange={(duration) => onChange({ ...values, duration: duration as number })}
        />

        <OptionGroup
          label="create.describe.format"
          value={values.format}
          options={[
            { value: '9:16', label: '9:16' },
            { value: '16:9', label: '16:9' },
            { value: '1:1', label: '1:1' },
          ]}
          onChange={(format) => onChange({ ...values, format: format as string })}
        />

        <StylePicker
          value={values.style}
          onChange={(style) => onChange({ ...values, style: style as string })}
        />
      </div>

      <div className={styles.actions}>
        <Button
          theme="solid"
          size="large"
          icon={<IconSend />}
          loading={isGenerating}
          onClick={onGenerate}
          className={styles.generateBtn}
        >
          {isGenerating ? t('create.describe.generating', 'Generating...') : t('create.describe.generate', 'Generate')}
        </Button>
      </div>
    </div>
  );
};

export default DescribeForm;
