import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Collapse } from '@douyinfe/semi-ui';
import { IconArrowLeft } from '@douyinfe/semi-icons';
import Logo from '@/components/ui/Logo';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import styles from './index.module.scss';

const TUTORIAL_KEYS = ['basics', 'ai', 'export', 'record'] as const;

/** 教程页（工单 WO6-04）：入门步骤 + 创作入口 */
const Tutorials: React.FC = () => {
  const { t } = useAppTranslation();
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <header className={styles.navbar}>
        <div className={styles.navLeft}>
          <Button
            icon={<IconArrowLeft />}
            theme="borderless"
            className={styles.backBtn}
            onClick={() => navigate('/')}
            aria-label={t('common.back')}
          />
          <Logo size="small" />
        </div>
        <h1 className={styles.pageTitle}>{t('tutorials.title')}</h1>
        <div className={styles.navRight} />
      </header>

      <main className={styles.main}>
        <p className={styles.subtitle}>{t('tutorials.subtitle')}</p>

        <Collapse className={styles.collapse}>
          {TUTORIAL_KEYS.map((key) => (
            <Collapse.Panel header={t(`tutorials.${key}Title`)} itemKey={key} key={key}>
              <ol className={styles.steps}>
                {[1, 2, 3, 4].map((step) => (
                  <li key={step}>{t(`tutorials.${key}Step${step}`)}</li>
                ))}
              </ol>
            </Collapse.Panel>
          ))}
        </Collapse>

        <Button theme="solid" size="large" className={styles.cta} onClick={() => navigate('/projects/new')}>
          {t('tutorials.cta')}
        </Button>
      </main>
    </div>
  );
};

export default Tutorials;
