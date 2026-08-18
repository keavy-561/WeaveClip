import React from 'react';
import { Link } from 'react-router-dom';
import { Tag } from '@douyinfe/semi-ui';
import type { Project } from '@/types/project';
import styles from './index.module.scss';

interface ProjectCardProps {
  project: Project;
}

const statusColorMap: Record<string, 'violet' | 'green' | 'orange' | 'blue' | 'red'> = {
  draft: 'violet',
  ready: 'green',
  analyzing: 'orange',
  generating: 'blue',
  rendering: 'red',
};

const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  return (
    <Link
      to={`/editor/${project.id}`}
      className={styles.card}
      tabIndex={0}
    >
      <div className={styles.thumb}>
        {project.thumbnailUrl ? (
          <img src={project.thumbnailUrl} alt={project.name} />
        ) : (
          <div className={styles.thumbPlaceholder}>{project.name[0]}</div>
        )}
      </div>
      <div className={styles.body}>
        <h3 className={styles.name}>{project.name}</h3>
        <div className={styles.meta}>
          <span className={styles.info}>{project.aspectRatio}</span>
          <span className={styles.separator}>·</span>
          <span className={styles.info}>
            {project.duration ? `${project.duration}s` : '—'}
          </span>
          <span className={styles.separator}>·</span>
          <span className={styles.info}>{project.style}</span>
        </div>
        <div className={styles.footer}>
          <Tag color={statusColorMap[project.status] || 'primary'} size="large" className={styles.statusTag}>
            {project.status}
          </Tag>
          <span className={styles.updatedAt}>
            {new Date(project.updatedAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </Link>
  );
};

export default ProjectCard;
