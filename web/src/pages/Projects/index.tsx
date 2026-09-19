import React from 'react';
import { Popconfirm, Skeleton, Empty, Button, Toast, Popover } from '@douyinfe/semi-ui';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IconArrowLeft, IconPlus, IconMore, IconDelete } from '@douyinfe/semi-icons';
import Logo from '@/components/ui/Logo';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import { projectService } from '@/services/projectService';
import { mockProjects } from '@/utils/mockData';
import styles from './index.module.scss';

const isMockMode = import.meta.env.VITE_API_MODE === 'mock';

const statusTextMap: Record<string, string> = {
  draft: 'statusDraft',
  ready: 'statusReady',
  analyzing: 'statusAnalyzing',
  generating: 'statusGenerating',
  rendering: 'statusRendering',
};

const Projects: React.FC = () => {
  const { t } = useAppTranslation();
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
            aria-label={t('common.back', 'Back')}
            onClick={() => navigate('/')}
          />
          <Logo size="small" />
        </div>
        <div className={styles.navCenter}>
          <h2 className={styles.title}>{t('projects.title')}</h2>
        </div>
        <div className={styles.navRight}>
          <LanguageSwitcher />
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.actionBar}>
          <Button
            theme="solid"
            size="small"
            icon={<IconPlus />}
            className={styles.newVideoBtn}
            onClick={() => navigate('/projects/new')}
          >
            {t('projects.newVideo')}
          </Button>
        </div>

        {isLoading ? (
          <div className={styles.grid}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className={styles.skeletonCard} />
            ))}
          </div>
        ) : error ? (
          <div className={styles.emptyWrap}>
            <Empty description={t('projects.loadError', 'Failed to load projects')} />
          </div>
        ) : projects.length === 0 ? (
          <div className={styles.emptyWrap}>
            <Empty description={t('projects.empty')}>
              <Button
                theme="solid"
                icon={<IconPlus />}
                className={styles.emptyCta}
                onClick={() => navigate('/projects/new')}
              >
                {t('projects.newVideo')}
              </Button>
            </Empty>
          </div>
        ) : (
          <div className={styles.grid}>
            {projects.map((project) => (
              <div
                key={project.id}
                className={styles.card}
                onClick={() => navigate(`/editor/${project.id}`)}
              >
                <div className={styles.cardBody}>
                  <h3 className={styles.cardTitle}>{project.name}</h3>
                </div>
                <div className={styles.cardFooter}>
                  <div className={styles.meta}>
                    <span>{project.aspectRatio}</span>
                    <span>
                      {project.duration ? `${project.duration}${t('home.durationUnit', 's')}` : '—'}
                    </span>
                    <span>{t(`mockData.style.${project.style}`, project.style)}</span>
                  </div>
                  <span className={styles.status}>{t(`home.${statusTextMap[project.status] || 'statusReady'}`)}</span>
                  <div className={styles.cardActions} onClick={(e) => e.stopPropagation()}>
                    <Popover
                      trigger="click"
                      content={
                        <div className={styles.popoverMenu}>
                          <Popconfirm
                            title={t('projects.deleteConfirmTitle')}
                            onConfirm={() => confirmDelete(project.id)}
                          >
                            <Button
                              theme="borderless"
                              size="small"
                              icon={<IconDelete />}
                              className={styles.popoverItem}
                            >
                              {t('projects.delete', 'Delete')}
                            </Button>
                          </Popconfirm>
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
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Projects;