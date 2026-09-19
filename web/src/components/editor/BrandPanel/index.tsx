import React from 'react';
import { Button, Input } from '@douyinfe/semi-ui';
import { useBrandStore, BRAND_PALETTE } from '@/stores/brandStore';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import styles from './index.module.scss';

/**
 * 品牌面板（工单 WO6-09）：品牌名作播放器水印，主色作字幕默认色。
 * 更改实时持久化到 localStorage。
 */
const BrandPanel: React.FC = () => {
  const brand = useBrandStore((s) => s.brand);
  const setBrand = useBrandStore((s) => s.setBrand);
  const { t } = useAppTranslation();

  return (
    <div className={styles.panel}>
      <label className={styles.field}>
        <span className={styles.label}>{t('editor.brand.nameLabel')}</span>
        <Input
          value={brand.name}
          onChange={(value) => setBrand({ name: value })}
          placeholder={t('editor.brand.namePlaceholder')}
          showClear
        />
      </label>

      <div className={styles.field}>
        <span className={styles.label}>{t('editor.brand.primaryLabel')}</span>
        <div className={styles.swatches}>
          {BRAND_PALETTE.map((swatch) => (
            <Button
              key={swatch}
              size="small"
              theme={brand.primaryColor === swatch ? 'solid' : 'borderless'}
              className={`${styles.swatch} ${brand.primaryColor === swatch ? styles.swatchActive : ''}`}
              style={{ background: swatch }}
              onClick={() => setBrand({ primaryColor: swatch })}
              aria-label={`${t('editor.brand.primaryLabel')} ${swatch}`}
              aria-pressed={brand.primaryColor === swatch}
            />
          ))}
        </div>
      </div>

      <div className={styles.field}>
        <span className={styles.label}>{t('editor.brand.secondaryLabel')}</span>
        <div className={styles.swatches}>
          {BRAND_PALETTE.map((swatch) => (
            <Button
              key={swatch}
              size="small"
              theme={brand.secondaryColor === swatch ? 'solid' : 'borderless'}
              className={`${styles.swatch} ${brand.secondaryColor === swatch ? styles.swatchActive : ''}`}
              style={{ background: swatch }}
              onClick={() => setBrand({ secondaryColor: swatch })}
              aria-label={`${t('editor.brand.secondaryLabel')} ${swatch}`}
              aria-pressed={brand.secondaryColor === swatch}
            />
          ))}
        </div>
      </div>

      <p className={styles.note}>{t('editor.brand.autoSaveNote')}</p>
    </div>
  );
};

export default BrandPanel;
