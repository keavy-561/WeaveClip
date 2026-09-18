import React from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '@douyinfe/semi-ui';
import type { Project } from '@/types/project';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import styles from './index.module.scss';

interface ProjectCardProps {
  project: Project;
}

const getEditedLabel = (
  t: (key: string, options?: Record<string, unknown>) => string,
  iso: string,
): string => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / 86_400_000);
  if (days >= 1) return t('home.editedDaysAgo', { days });
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours >= 1) return t('home.editedHoursAgo', { hours });
  return t('home.editedJustNow');
};

const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const { t } = useAppTranslation();

  return (
    <Link to={`/editor/${project.id}`} className={styles.card} tabIndex={0}>
      <div className={styles.body}>
        <div className={styles.caption}>
          <div className={styles.owner}>
            <Avatar size="extra-small" className={styles.ownerAvatar}>
              {t('home.ownerMe').charAt(0)}
            </Avatar>
            <span className={styles.ownerName}>{t('home.ownerMe')}</span>
          </div>
          <span className={styles.edited}>{getEditedLabel(t, project.updatedAt)}</span>
        </div>
        <h3 className={styles.name}>{project.name}</h3>
        <div className={styles.chips}>
          <span className={styles.chip}>{project.resolution ?? '1080p'}</span>
          <span className={styles.chip}>{project.frameRate ?? '60fps'}</span>
        </div>
      </div>
      <div className={styles.footer}>
        <span>{project.aspectRatio}</span>
        <span>{project.duration ? `${project.duration}${t('home.durationUnit')}` : '—'}</span>
        <span>{t(`mockData.style.${project.style}`, project.style)}</span>
      </div>
    </Link>
  );
};

export default ProjectCard;