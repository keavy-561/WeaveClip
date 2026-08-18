import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@douyinfe/semi-ui';
import Logo from '@/components/ui/Logo';
import ThemeToggle from '@/components/ui/ThemeToggle';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { mockProjects } from '@/utils/mockData';
import styles from './index.module.scss';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className={styles.page}>
      {/* Navbar */}
      <header className={styles.navbar}>
        <div className={styles.navLeft}>
          <Logo />
        </div>
        <nav className={styles.navLinks}>
          <button className={`${styles.navLink} ${styles.active}`} onClick={() => navigate('/')}>
            {t('nav.home')}
          </button>
          <button className={styles.navLink} onClick={() => navigate('/projects')}>
            {t('nav.projects')}
          </button>
        </nav>
        <div className={styles.navRight}>
          <ThemeToggle />
          <LanguageSwitcher />
          <div className={styles.avatar}>U</div>
        </div>
      </header>

      {/* Hero */}
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

      {/* Recent Projects */}
      <section className={styles.projects}>
        <h2 className={styles.sectionTitle}>{t('home.recentProjects')}</h2>
        <div className={styles.projectGrid}>
          {mockProjects.map((project) => (
            <div
              key={project.id}
              className={styles.projectCard}
              onClick={() => navigate(`/editor/${project.id}`)}
            >
              <div className={styles.projectHeader}>
                <h3 className={styles.projectName}>{t(project.name)}</h3>
              </div>
              <div className={styles.projectMeta}>
                <div className={styles.projectInfo}>
                  <span className={styles.badge}>{project.aspectRatio}</span>
                  <span className={styles.info}>
                    {project.duration ? `${project.duration}${t('home.durationUnit')}` : '—'}
                  </span>
                  <span className={styles.info}>{project.style}</span>
                </div>
                <div className={styles.projectStatus}>{t(`home.status${project.status.charAt(0).toUpperCase() + project.status.slice(1)}`)}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
