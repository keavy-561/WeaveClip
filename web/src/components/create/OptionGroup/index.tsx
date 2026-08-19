import React from 'react';
import { RadioGroup, Radio } from '@douyinfe/semi-ui';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import styles from './index.module.scss';

export interface Option {
  value: string | number;
  label: string;
}

export interface OptionGroupProps {
  label: string;
  value: string | number;
  options: Option[];
  onChange: (value: string | number) => void;
}

const OptionGroup: React.FC<OptionGroupProps> = ({
  label,
  value,
  options,
  onChange,
}) => {
  const { t } = useAppTranslation();

  return (
    <div className={styles.optionGroup}>
      <label className={styles.optionLabel}>{t(label, label)}</label>
              <RadioGroup
        type="button"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <Radio key={opt.value} value={opt.value}>
            {opt.label}
          </Radio>
        ))}
      </RadioGroup>
    </div>
  );
};

export default OptionGroup;
