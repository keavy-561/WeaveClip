import React, { useState } from 'react';
import { Button, InputNumber, Select, TextArea, Toast } from '@douyinfe/semi-ui';
import { useTimelineStore } from '@/stores/timelineStore';
import { useBrandStore, BRAND_PALETTE } from '@/stores/brandStore';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import type { CaptionStyle } from '@/types/timeline';
import styles from './index.module.scss';

type CaptionPosition = CaptionStyle['position'];

const POSITION_OPTIONS: Array<{ value: CaptionPosition }> = (
  ['top', 'center', 'bottom'] as const
).map((value) => ({ value }));

/**
 * 文本面板（工单 WO6-08）：添加字幕片段到字幕轨。
 * 字幕片段可在右侧检查器的「字幕」tab 继续编辑文本。
 */
const TextPanel: React.FC = () => {
  const addCaption = useTimelineStore((s) => s.addCaption);
  const currentTime = useTimelineStore((s) => s.currentTime);
  const brandPrimary = useBrandStore((s) => s.brand.primaryColor);
  const { t } = useAppTranslation();

  const [text, setText] = useState('');
  const [color, setColor] = useState(brandPrimary);
  const [position, setPosition] = useState<CaptionPosition>('bottom');
  const [duration, setDuration] = useState(3);

  const positionLabel = (value: CaptionPosition): string =>
    value === 'top'
      ? t('editor.text.positionTop')
      : value === 'center'
        ? t('editor.text.positionCenter')
        : t('editor.text.positionBottom');

  const handleAdd = () => {
    if (!text.trim()) return;
    addCaption(text.trim(), currentTime, duration, {
      font: 'Manrope',
      size: 24,
      color,
      position,
      animation: 'fadeIn',
    });
    Toast.success(t('editor.text.added'));
    setText('');
  };

  return (
    <div className={styles.panel}>
      <label className={styles.field}>
        <span className={styles.label}>{t('editor.text.textLabel')}</span>
        <TextArea
          rows={3}
          value={text}
          onChange={(value) => setText(value)}
          placeholder={t('editor.text.placeholder')}
          maxCount={120}
        />
      </label>

      <div className={styles.field}>
        <span className={styles.label}>{t('editor.text.colorLabel')}</span>
        <div className={styles.swatches}>
          {BRAND_PALETTE.map((swatch) => (
            <Button
              key={swatch}
              size="small"
              theme={color === swatch ? 'solid' : 'borderless'}
              className={`${styles.swatch} ${color === swatch ? styles.swatchActive : ''}`}
              style={{ background: swatch }}
              onClick={() => setColor(swatch)}
              aria-label={swatch}
              aria-pressed={color === swatch}
            />
          ))}
        </div>
      </div>

      <label className={styles.field}>
        <span className={styles.label}>{t('editor.text.positionLabel')}</span>
        <Select
          value={position}
          onChange={(value) => setPosition(value as CaptionPosition)}
          optionList={POSITION_OPTIONS.map((option) => ({
            value: option.value,
            label: positionLabel(option.value),
          }))}
          aria-label={t('editor.text.positionLabel')}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>{t('editor.text.durationLabel')}</span>
        <InputNumber
          value={duration}
          min={1}
          max={10}
          step={1}
          onChange={(value) => setDuration(Math.min(10, Math.max(1, Number(value) || 3)))}
          aria-label={t('editor.text.durationLabel')}
        />
      </label>

      <Button theme="solid" block disabled={!text.trim()} onClick={handleAdd}>
        {t('editor.text.add')}
      </Button>
      <p className={styles.note}>{t('editor.text.note')}</p>
    </div>
  );
};

export default TextPanel;
