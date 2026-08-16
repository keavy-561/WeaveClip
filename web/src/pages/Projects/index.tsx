import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Empty } from '@douyinfe/semi-ui';
import { IconPlus, IconArrowLeft } from '@douyinfe/semi-icons';
import Logo from '@/components/ui/Logo';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { mockProjects } from '@/utils/mockData';
import styles from './index.module.scss';

const Projects: React.FC = () => {
  const navigate = useNavigate();

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
          <h2 className={styles.title}>Projects</h2>
        </div>
        <div className={styles.navRight}>
          <ThemeToggle />
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.actions}>
          <Button
            theme="solid"
            icon={<IconPlus />}
            onClick={() => navigate('/projects/new')}
          >
            New Video
          </Button>
        </div>

        {mockProjects.length === 0 ? (
          <Empty
            title="No projects yet"
            description="Create your first video to get started."
          />
        ) : (
          <div className={styles.grid}>
            {mockProjects.map((project) => (
              <Card
                key={project.id}
                className={styles.card}
                title={project.name}
                onClick={() => navigate(`/editor/${project.id}`)}
              >
                <div className={styles.meta}>
                  <span className={styles.badge}>{project.aspectRatio}</span>
                  <span className={styles.info}>
                    {project.duration ? `${project.duration}s` : '—'}
                  </span>
                  <span className={styles.info}>{project.style}</span>
                  <span className={styles.status}>{project.status}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Projects;
