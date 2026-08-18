import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@douyinfe/semi-ui';
import { IconArrowLeft, IconPlus } from '@douyinfe/semi-icons';
import Logo from '@/components/ui/Logo';
import ThemeToggle from '@/components/ui/ThemeToggle';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { mockProjects } from '@/utils/mockData';
import styles from './index.module.scss';

const Projects: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className={styles.page}>
      <header className={styles.navbar}>
        <div className={styles.navLeft}>
          <Button
            icon={<IconArrowLeft />}
            theme="borderless"
            onClick={() => navigate('/')}
            style={{ color: 'var(--semi-color-text-1)' }}
          />
          <Logo size="small" />
        </div>
        <div className={styles.navCenter}>
          <h2 className={styles.title}>{t('projects.title')}</h2>
        </div>
        <div className={styles.navRight}>
          <ThemeToggle />
          <LanguageSwitcher />
          <Button theme="solid" size="small" icon={<IconPlus />} onClick={() => navigate('/projects/new')}>
            {t('projects.newVideo')}
          </Button>
        </div>
      </header>

      <main className={styles.main}>
        {mockProjects.length === 0 ? (
          <div className={styles.empty}>{t('projects.empty')}</div>
        ) : (
          <div className={styles.grid}>
            {mockProjects.map((project) => (
              <div
                key={project.id}
                className={styles.card}
                onClick={() => navigate(`/editor/${project.id}`)}
              >
                <h3 className={styles.cardTitle}>{project.name}</h3>
                <div className={styles.meta}>
                  <div className={styles.metaLeft}>
                    <span className={styles.badge}>{project.aspectRatio}</span>
                    <span className={styles.info}>
                      {project.duration ? `${project.duration}${t('home.durationUnit', 's')}` : '—'}
                    </span>
                    <span className={styles.info}>{project.style}</span>
                  </div>
                  <span className={styles.status}>{project.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Projects;
