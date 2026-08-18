import React from 'react';
import { Skeleton, Empty, Button, Toast, Popover } from '@douyinfe/semi-ui';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IconArrowLeft, IconPlus, IconMore, IconDelete } from '@douyinfe/semi-icons';
import Logo from '@/components/ui/Logo';
import ThemeToggle from '@/components/ui/ThemeToggle';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import { projectService } from '@/services/projectService';
import { mockProjects } from '@/utils/mockData';
import styles from './index.module.scss';

const isMockMode = import.meta.env.VITE_API_MODE === 'mock';

const Projects: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: apiProjects = [], isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: projectService.list,
    enabled: !isMockMode,
  });

  const [localProjects, setLocalProjects] = React.useState(mockProjects);

  const projects = isMockMode ? localProjects : apiProjects;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      Toast.success(t('projects.deleteSuccess', 'Project deleted'));
    },
    onError: () => {
      Toast.error(t('projects.deleteError', 'Failed to delete project'));
    },
  });

  const confirmDelete = (id: string) => {
    if (isMockMode) {
      setLocalProjects((prev) => prev.filter((p) => p.id !== id));
    } else {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.navbar}>
        <div className={styles.navLeft}>
          <Button
            icon={<IconArrowLeft />}
            theme="borderless"
            className={styles.backBtn}
            onClick={() => navigate('/')}
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
        {isLoading ? (
          <div className={styles.skeletonGrid}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className={styles.card} />
            ))}
          </div>
        ) : error ? (
          <Empty description={t('projects.loadError', 'Failed to load projects')} />
        ) : projects.length === 0 ? (
          <div className={styles.empty}>{t('projects.empty')}</div>
        ) : (
          <div className={styles.grid}>
            {projects.map((project) => (
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
                <div className={styles.cardActions} onClick={(e) => e.stopPropagation()}>
                  <Popover
                    trigger="click"
                    content={
                      <div className={styles.popoverMenu}>
                        <div className={styles.popoverItem} onClick={() => confirmDelete(project.id)}>
                          <IconDelete />
                          {t('projects.delete', 'Delete')}
                        </div>
                      </div>
                    }
                    position="bottomRight"
                  >
                    <Button
                      icon={<IconMore />}
                      theme="borderless"
                      size="small"
                      className={styles.actionBtn}
                      aria-label={t('projects.actions', 'Actions')}
                    />
                  </Popover>
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
