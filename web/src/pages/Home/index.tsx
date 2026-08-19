import React from 'react';
import { Skeleton, Empty, Button } from '@douyinfe/semi-ui';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import HeroSection from '@/components/home/HeroSection';
import ProjectCard from '@/components/home/ProjectCard';
import ExamplePrompts from '@/components/home/ExamplePrompts';
import type { ExamplePrompt } from '@/components/home/ExamplePrompts';
import ThemeToggle from '@/components/ui/ThemeToggle';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import { projectService } from '@/services/projectService';
import { mockProjects } from '@/utils/mockData';
import styles from './index.module.scss';

const isMockMode = import.meta.env.VITE_API_MODE === 'mock';

const Home: React.FC = () => {
  const { t } = useAppTranslation();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: projectService.list,
    staleTime: 1000 * 60,
    enabled: !isMockMode,
  });

  const projects = isMockMode ? mockProjects : (data || []);

  const examplePrompts: ExamplePrompt[] = [
    { id: '1', text: '帮我剪一个 45 秒的纽约旅行 vlog，节奏轻快', labelKey: 'home.examplePrompt1' },
    { id: '2', text: '做一个产品预告片，突出科技感', labelKey: 'home.examplePrompt2' },
    { id: '3', text: '把这段海滩 footage 剪成 30 秒的治愈短片', labelKey: 'home.examplePrompt3' },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.navbar}>
        <div className={styles.navLeft}>
          <span className={styles.logoText}>WeaveClip</span>
        </div>
        <nav className={styles.navLinks}>
          <button className={`${styles.navLink} ${styles.active}`} type="button">
            {t('nav.home')}
          </button>
          <Link to="/projects" className={styles.navLink}>
            {t('nav.projects')}
          </Link>
        </nav>
        <div className={styles.navRight}>
          <ThemeToggle />
          <LanguageSwitcher />
          <div className={styles.avatar}>U</div>
        </div>
      </header>

      <HeroSection />

      <section className={styles.projects}>
        <h2 className={styles.sectionTitle}>{t('home.recentProjects')}</h2>
        {isLoading ? (
          <div className={styles.skeletonGrid}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className={styles.skeletonCard} />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className={styles.emptyState}>
            <Empty description={t('projects.empty')} />
            <Button theme="solid" className={styles.emptyCta} onClick={() => navigate('/projects/new')}>
              {t('home.ctaNewVideo')}
            </Button>
          </div>
        ) : (
          <div className={styles.projectGrid}>
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </section>

      <ExamplePrompts prompts={examplePrompts} />
    </div>
  );
};

export default Home;
