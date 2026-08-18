import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@douyinfe/semi-ui';
import Logo from '@/components/ui/Logo';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { mockProjects } from '@/utils/mockData';
import styles from './index.module.scss';

const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      {/* Navbar */}
      <header className={styles.navbar}>
        <div className={styles.navLeft}>
          <Logo />
        </div>
        <nav className={styles.navLinks}>
          <button className={`${styles.navLink} ${styles.active}`} onClick={() => navigate('/')}>
            家
          </button>
          <button className={styles.navLink} onClick={() => navigate('/projects')}>
            项目
          </button>
        </nav>
        <div className={styles.navRight}>
          <ThemeToggle />
          <div className={styles.avatar}>U</div>
        </div>
      </header>

      {/* Hero */}
      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>
          对着你的素材说话。
          <br />
          <span className={styles.heroAccent}>得到你想要的视频。</span>
        </h1>
        <p className={styles.heroSubtitle}>
          告诉人工智能你的需求。它会挑选最佳片段，排列时间线，并生成你的视频。最终剪辑由你掌控。
        </p>
        <Button
          theme="solid"
          size="large"
          className={styles.ctaButton}
          onClick={() => navigate('/projects/new')}
        >
          + 新视频
        </Button>
      </section>

      {/* Recent Projects */}
      <section className={styles.projects}>
        <h2 className={styles.sectionTitle}>近期项目</h2>
        <div className={styles.projectGrid}>
          {mockProjects.map((project) => (
            <div
              key={project.id}
              className={styles.projectCard}
              onClick={() => navigate(`/editor/${project.id}`)}
            >
              <div className={styles.projectHeader}>
                <h3 className={styles.projectName}>{project.name}</h3>
              </div>
              <div className={styles.projectMeta}>
                <div className={styles.projectInfo}>
                  <span className={styles.badge}>{project.aspectRatio}</span>
                  <span className={styles.info}>
                    {project.duration ? `${project.duration}秒` : '—'}
                  </span>
                  <span className={styles.info}>{project.style}</span>
                </div>
                <div className={styles.projectStatus}>{project.status}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
