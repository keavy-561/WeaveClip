import React from 'react';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { Button } from '@douyinfe/semi-ui';
import { useNavigate } from 'react-router-dom';
import styles from './index.module.scss';

const HeroSection: React.FC = () => {
  const { t } = useAppTranslation();
  const navigate = useNavigate();

  return (
    <section className={styles.hero}>
      <h1 className={styles.heroTitle}>
        {t('home.heroTitle')}
        <br />
        <span className={styles.heroAccent}>{t('home.heroTitleAccent')}</span>
      </h1>
      <p className={styles.heroSubtitle}>{t('home.heroSubtitle')}</p>
      <Button
        theme="solid"
        size="large"
        className={styles.ctaButton}
        onClick={() => navigate('/projects/new')}
      >
        {t('home.ctaNewVideo')}
      </Button>
    </section>
  );
};

export default HeroSection;
