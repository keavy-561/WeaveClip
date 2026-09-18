import React from 'react';
import type { Template } from '@/types/template';
import TemplateCard from '@/components/home/TemplateCard';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { IconStar } from '@douyinfe/semi-icons';
import styles from './index.module.scss';

interface TemplateGridProps {
  templates: Template[];
}

const TemplateGrid: React.FC<TemplateGridProps> = ({ templates }) => {
  const { t } = useAppTranslation();

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>
        <IconStar className={styles.titleIcon} />
        {t('home.templatesTitle')}
      </h2>
      <div className={styles.grid}>
        {templates.map((template) => (
          <TemplateCard key={template.id} template={template} />
        ))}
      </div>
    </section>
  );
};

export default TemplateGrid;