import React from 'react';
import { Popconfirm, Skeleton, Empty, Button, Input, Modal, Toast, Popover } from '@douyinfe/semi-ui';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IconArrowLeft, IconPlus, IconMore, IconDelete } from '@douyinfe/semi-icons';
import Logo from '@/components/ui/Logo';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import { projectService } from '@/services/projectService';
import { timelineService } from '@/services/timelineService';
import { mockProjects, addMockProject } from '@/utils/mockData';
import type { Project } from '@/types/project';
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

  // 重命名/复制（工单 WO9-01）：操作菜单补齐"删除"之外的基本项目管理能力
  const [renameTarget, setRenameTarget] = React.useState<Project | null>(null);
  const [renameValue, setRenameValue] = React.useState('');

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => projectService.update(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      Toast.success(t('projects.renameSuccess'));
      setRenameTarget(null);
    },
    onError: () => {
      Toast.error(t('projects.renameError'));
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (project: Project) => {
      const created = await projectService.create({
        name: t('projects.copySuffixName', { name: project.name }),
        duration: project.duration ?? undefined,
        aspectRatio: project.aspectRatio,
        style: project.style,
      });
      // 复制最新时间线；素材对象不复制（对象存储复制需后端支持，已在工单申报）
      const timeline = await timelineService.get(project.id).catch(() => null);
      if (timeline?.timelineJson) {
        await timelineService.save(created.id, timeline.timelineJson, 'duplicated');
      }
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      Toast.success(t('projects.duplicateSuccess'));
    },
    onError: () => {
      Toast.error(t('projects.duplicateError'));
    },
  });

  const handleRename = (id: string, name: string) => {
    if (isMockMode) {
      setLocalProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, name, updatedAt: new Date().toISOString() } : p))
      );
      Toast.success(t('projects.renameSuccess'));
      setRenameTarget(null);
      return;
    }
    renameMutation.mutate({ id, name });
  };

  const handleDuplicate = (project: Project) => {
    if (isMockMode) {
      const id = `proj_${Date.now()}`;
      const now = new Date().toISOString();
      addMockProject({
        ...project,
        id,
        name: t('projects.copySuffixName', { name: project.name }),
        status: 'draft',
        createdAt: now,
        updatedAt: now,
      });
      setLocalProjects((prev) => [
        ...prev,
        { ...project, id, name: t('projects.copySuffixName', { name: project.name }), status: 'draft' as const, createdAt: now, updatedAt: now },
      ]);
      Toast.success(t('projects.duplicateSuccess'));
      return;
    }
    duplicateMutation.mutate(project);
  };

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
              <Link
                key={project.id}
                to={`/editor/${project.id}`}
                className={styles.card}
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
                          <Button
                            theme="borderless"
                            size="small"
                            className={styles.popoverItem}
                            onClick={() => {
                              setRenameTarget(project);
                              setRenameValue(project.name);
                            }}
                          >
                            {t('projects.rename')}
                          </Button>
                          <Button
                            theme="borderless"
                            size="small"
                            className={styles.popoverItem}
                            onClick={() => handleDuplicate(project)}
                          >
                            {t('projects.duplicate')}
                          </Button>
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
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* 重命名弹窗（工单 WO9-01） */}
      <Modal
        title={t('projects.renameTitle')}
        visible={renameTarget !== null}
        onOk={() => {
          const name = renameValue.trim();
          if (renameTarget && name) handleRename(renameTarget.id, name);
        }}
        onCancel={() => setRenameTarget(null)}
        okButtonProps={{ disabled: !renameValue.trim() }}
        closeOnEsc
      >
        <Input value={renameValue} onChange={setRenameValue} placeholder={t('projects.renamePlaceholder')} />
      </Modal>
    </div>
  );
};

export default Projects;