import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '@douyinfe/semi-ui';
import { IconPlus } from '@douyinfe/semi-icons';
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
          <button
            className={`${styles.navLink} ${styles.active}`}
            onClick={() => navigate('/')}
          >
            Home
          </button>
          <button className={styles.navLink} onClick={() => navigate('/projects')}>
            Projects
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
          Talk to your footage.
          <br />
          <span className={styles.heroAccent}>Get the video you mean.</span>
        </h1>
        <p className={styles.heroSubtitle}>
          Tell AI what you want. It picks the best clips, arranges the timeline,
          and generates your video. You control the final cut.
        </p>
        <Button
          theme="solid"
          size="large"
          icon={<IconPlus />}
          className={styles.ctaButton}
          onClick={() => navigate('/projects/new')}
        >
          New Video
        </Button>
      </section>

      {/* Recent Projects */}
      <section className={styles.projects}>
        <h2 className={styles.sectionTitle}>Recent Projects</h2>
        <div className={styles.projectGrid}>
          {mockProjects.map((project) => (
            <Card
              key={project.id}
              className={styles.projectCard}
              title={project.name}
              onClick={() => navigate(`/editor/${project.id}`)}
            >
              <div className={styles.projectMeta}>
                <div className={styles.projectInfo}>
                  <span className={styles.badge}>{project.aspectRatio}</span>
                  <span className={styles.duration}>
                    {project.duration ? `${project.duration}s` : '—'}
                  </span>
                  <span className={styles.style}>{project.style}</span>
                </div>
                <div className={styles.projectStatus}>{project.status}</div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
