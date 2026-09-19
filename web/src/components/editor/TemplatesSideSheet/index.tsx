import React from 'react';
import { Button, SideSheet } from '@douyinfe/semi-ui';
import { mockTemplates } from '@/utils/mockData';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import type { Template } from '@/types/template';
import styles from './index.module.scss';

interface TemplatesSideSheetProps {
  visible: boolean;
  onClose: () => void;
  /** 点击「使用模板」：携带模板 prompt 交由调用方处理（预填 AI 对话，工单 WO6-01） */
  onUse: (prompt: string) => void;
}

const toneClassMap: Record<Template['tone'], string> = {
  slate: styles.toneSlate,
  rose: styles.toneRose,
  sage: styles.toneSage,
  steel: styles.toneSteel,
};

/** 模板中心（工单 WO6-01）：替代原先的「开发中」Toast 占位 */
const TemplatesSideSheet: React.FC<TemplatesSideSheetProps> = ({ visible, onClose, onUse }) => {
  const { t } = useAppTranslation();

  return (
    <SideSheet
      title={t('editor.templates.title')}
      visible={visible}
      onCancel={onClose}
      width={420}
      closeOnEsc
    >
      <p className={styles.subtitle}>{t('editor.templates.subtitle')}</p>
      <div className={styles.list}>
        {mockTemplates.map((template) => (
          <div key={template.id} className={styles.card}>
            <div className={`${styles.thumb} ${toneClassMap[template.tone]}`} aria-hidden />
            <div className={styles.info}>
              <span className={`${styles.tag} ${toneClassMap[template.tone]}`}>
                {t(template.tagKey)}
              </span>
              <h4 className={styles.name}>{t(template.titleKey)}</h4>
              <p className={styles.prompt}>{t(template.promptKey)}</p>
            </div>
            <Button
              theme="solid"
              size="small"
              className={styles.useBtn}
              onClick={() => onUse(t(template.promptKey))}
            >
              {t('editor.templates.use')}
            </Button>
          </div>
        ))}
      </div>
    </SideSheet>
  );
};

export default TemplatesSideSheet;
