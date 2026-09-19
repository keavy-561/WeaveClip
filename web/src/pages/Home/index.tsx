import React, { useState } from 'react';
import { Skeleton, Empty, Button, Dropdown, Input, Toast, Avatar } from '@douyinfe/semi-ui';
import { IconSearch } from '@douyinfe/semi-icons';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Logo from '@/components/ui/Logo';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import HeroSection from '@/components/home/HeroSection';
import TemplateGrid from '@/components/home/TemplateGrid';
import SidebarNav, { type ProjectFilter } from '@/components/home/SidebarNav';
import { logout } from '@/utils/auth';
import ProjectCard from '@/components/home/ProjectCard';
import { projectService } from '@/services/projectService';
import { mockProjects, mockTemplates, mockStorage } from '@/utils/mockData';
import styles from './index.module.scss';

const isMockMode = import.meta.env.VITE_API_MODE === 'mock';

const Home: React.FC = () => {
  const { t } = useAppTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ProjectFilter>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: projectService.list,
    staleTime: 1000 * 60,
    enabled: !isMockMode,
  });

  const baseProjects = isMockMode ? mockProjects : (data || []);
  const visibleProjects =
    filter === 'team' || filter === 'trash'
      ? []
      : baseProjects.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()));

  const handleLogout = () => {
    logout();
    Toast.success(t('home.logoutSuccess'));
    navigate('/login');
  };

  const handleNavClick = (path: string | null) => {
    if (path) {
      navigate(path);
    } else {
      Toast.info(t('home.comingSoon'));
    }
  };

  return (
    <div className={styles.page}>
      {/* 顶部导航：品牌 + 搜索 + 导航 + 头像 */}
      <header className={styles.navbar}>
        <Link to="/" className={styles.brand}>
          <Logo size="small" />
          <span className={styles.brandName}>{t('common.appNameFull')}</span>
        </Link>

        <Input
          className={styles.search}
          prefix={<IconSearch />}
          placeholder={t('home.searchPlaceholder')}
          value={query}
          onChange={(value) => setQuery(value)}
          aria-label={t('home.searchPlaceholder')}
        />

        <nav className={styles.nav}>
          <Button
            theme="borderless"
            className={`${styles.navLink} ${styles.navLinkActive}`}
            onClick={() => handleNavClick('/')}
          >
            {t('nav.home')}
          </Button>
          <Button theme="borderless" className={styles.navLink} onClick={() => handleNavClick('/projects')}>
            {t('nav.projects')}
          </Button>
          <Button theme="borderless" className={styles.navLink} onClick={() => handleNavClick('/community')}>
            {t('nav.community')}
          </Button>
          <Button theme="borderless" className={styles.navLink} onClick={() => handleNavClick('/tutorials')}>
            {t('nav.tutorials')}
          </Button>
          <Button theme="borderless" className={styles.navLink} onClick={() => handleNavClick('/pricing')}>
            {t('nav.pricing')}
          </Button>
        </nav>

        <div className={styles.navRight}>
          <LanguageSwitcher />
          <Dropdown
            trigger="click"
            position="bottomRight"
            menu={[
              { node: 'item' as const, name: t('home.menu.settings'), onClick: () => navigate('/settings') },
              { node: 'item' as const, name: t('home.menu.logout'), onClick: handleLogout },
            ]}
          >
            <Avatar size="default" className={styles.avatar}>
              {t('home.ownerMe').charAt(0)}
            </Avatar>
          </Dropdown>
        </div>
      </header>

      <main className={styles.main}>
        <HeroSection />

        <TemplateGrid templates={mockTemplates} />

        <div className={styles.content}>
          <SidebarNav
            active={filter}
            onSelect={setFilter}
            usedGB={mockStorage.usedGB}
            totalGB={mockStorage.totalGB}
          />

          <section className={styles.recent}>
            <div className={styles.recentHeader}>
              <h2 className={styles.sectionTitle}>{t('home.recentProjects')}</h2>
              <Button
                theme="borderless"
                size="small"
                className={styles.seeAll}
                onClick={() => navigate('/projects')}
              >
                {t('common.seeAll')}
              </Button>
            </div>

            {isLoading ? (
              <div className={styles.projectGrid}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className={styles.skeletonCard} />
                ))}
              </div>
            ) : visibleProjects.length === 0 ? (
              <div className={styles.emptyState}>
                <Empty description={t('home.noResults')} />
                <Button theme="solid" className={styles.emptyCta} onClick={() => navigate('/projects/new')}>
                  {t('home.ctaNewVideo')}
                </Button>
              </div>
            ) : (
              <div className={styles.projectGrid}>
                {visibleProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default Home;