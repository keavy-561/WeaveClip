import React from 'react';
import { useTranslation } from 'react-i18next';
import OptionGroup from '../OptionGroup';
import styles from './index.module.scss';

export interface StyleOption {
  value: string;
  labelKey: string;
}

const STYLE_OPTIONS: StyleOption[] = [
  { value: 'cinematic', labelKey: 'create.describe.styleCinematic' },
  { value: 'energetic', labelKey: 'create.describe.styleEnergetic' },
  { value: 'minimal', labelKey: 'create.describe.styleMinimal' },
  { value: 'storytelling', labelKey: 'create.describe.styleStorytelling' },
];

export interface StylePickerProps {
  value: string;
  onChange: (value: string) => void;
}

const StylePicker: React.FC<StylePickerProps> = ({ value, onChange }) => {
  const { t } = useTranslation();

  return (
    <div className={styles.stylePicker}>
      <OptionGroup
        label="create.describe.style"
        value={value}
        options={STYLE_OPTIONS.map((opt) => ({
          value: opt.value,
          label: t(opt.labelKey, opt.value),
        }))}
        onChange={(style) => onChange(style as string)}
      />
    </div>
  );
};

export default StylePicker;
