import React from 'react';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import styles from './index.module.scss';

/**
 * 品牌 Logo — 复刻设计稿「织影 WeaveClip Logo」徽章：
 * slate 灰蓝圆角底 + 三条竖织带与一条纬带穿插，中段菱形织结。
 */
const Logo: React.FC<{ size?: 'normal' | 'small' }> = ({ size = 'normal' }) => {
  const { t } = useAppTranslation();

  return (
    <div className={`${styles.logo} ${styles[size]}`}>
      <svg viewBox="0 0 28 28" className={styles.icon} fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* 徽章底 */}
        <rect width="28" height="28" rx="7.5" fill="var(--color-logo-bg)" />
        {/* 三条竖织带 */}
        <g fill="var(--color-logo-weave)">
          <rect x="6.2" y="5" width="3.6" height="18" rx="1.8" />
          <rect x="12.2" y="5" width="3.6" height="18" rx="1.8" />
          <rect x="18.2" y="5" width="3.6" height="18" rx="1.8" />
        </g>
        {/* 纬带（横穿中部） */}
        <rect x="6.2" y="14.8" width="15.6" height="3.4" rx="1.7" fill="var(--color-logo-weave)" />
        {/* 经纬穿插：两条竖带在纬带交汇处被压入下层 */}
        <g fill="var(--color-logo-bg)">
          <rect x="6.2" y="15.6" width="3.6" height="3.4" />
          <rect x="10.3" y="14.4" width="3.6" height="1.4" />
          <rect x="18.2" y="15.6" width="3.6" height="3.4" />
        </g>
        {/* 织结（中心菱形） */}
        <path d="M14 17.4 l3 2.4 -3 2.4 -3 -2.4 Z" fill="var(--color-logo-weave)" />
        <path d="M14 14.2 l2.2 1.8 -2.2 1.8 -2.2 -1.8 Z" fill="var(--color-logo-bg)" />
      </svg>
      <span className={styles.name}>{t('common.brand')}</span>
    </div>
  );
};

export default Logo;