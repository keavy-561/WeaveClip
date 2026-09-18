import React from 'react';
import { Link } from 'react-router-dom';
import type { Template } from '@/types/template';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import styles from './index.module.scss';

interface TemplateCardProps {
  template: Template;
}

const toneClassMap: Record<Template['tone'], string> = {
  slate: styles.toneSlate,
  rose: styles.toneRose,
  sage: styles.toneSage,
  steel: styles.toneSteel,
};

const TemplateCard: React.FC<TemplateCardProps> = ({ template }) => {
  const { t } = useAppTranslation();

  return (
    <Link
      to={`/projects/new/describe?prompt=${encodeURIComponent(t(template.promptKey))}`}
      className={styles.card}
      tabIndex={0}
    >
      <div className={`${styles.thumb} ${toneClassMap[template.tone]}`} />
      <div className={styles.overlay} />
      <div className={styles.content}>
        <span className={`${styles.tag} ${toneClassMap[template.tone]}`}>{t(template.tagKey)}</span>
        <h4 className={styles.name}>{t(template.titleKey)}</h4>
      </div>
    </Link>
  );
};

export default TemplateCard;