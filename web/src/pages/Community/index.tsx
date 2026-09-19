import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@douyinfe/semi-ui';
import { IconArrowLeft } from '@douyinfe/semi-icons';
import Logo from '@/components/ui/Logo';
import TemplateGrid from '@/components/home/TemplateGrid';
import ProjectCard from '@/components/home/ProjectCard';
import { mockProjects, mockTemplates } from '@/utils/mockData';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import styles from './index.module.scss';

/** 社区页（工单 WO6-03）：模板广场 + 热门作品 */
const Community: React.FC = () => {
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
        <h1 className={styles.pageTitle}>{t('community.title')}</h1>
        <div className={styles.navRight} />
      </header>

      <main className={styles.main}>
        <p className={styles.subtitle}>{t('community.subtitle')}</p>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('community.trendingTemplates')}</h2>
          <TemplateGrid templates={mockTemplates} />
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('community.trendingProjects')}</h2>
          <div className={styles.projectGrid}>
            {mockProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Community;
