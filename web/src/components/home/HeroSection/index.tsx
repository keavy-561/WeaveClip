import React from 'react';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { Button } from '@douyinfe/semi-ui';
import { IconPlus } from '@douyinfe/semi-icons';
import { useNavigate } from 'react-router-dom';
import styles from './index.module.scss';

const HeroSection: React.FC = () => {
  const { t } = useAppTranslation();
  const navigate = useNavigate();

  return (
    <section className={styles.hero}>
      <h1 className={styles.title}>
        {t('home.heroTitle')}
        <br />
        <span className={styles.accent}>{t('home.heroTitleAccent')}</span>
      </h1>
      <p className={styles.subtitle}>{t('home.heroSubtitle')}</p>
      <Button
        theme="solid"
        className={styles.cta}
        icon={<IconPlus />}
        onClick={() => navigate('/projects/new')}
      >
        {t('home.ctaNewVideo')}
      </Button>
      {/* 设计稿右上装饰图标（大屏显示） */}
      <div className={styles.deco} aria-hidden="true">
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      </div>
    </section>
  );
};

export default HeroSection;