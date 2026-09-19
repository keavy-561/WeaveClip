import React from 'react';
import { Button } from '@douyinfe/semi-ui';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import styles from './index.module.scss';

interface QuickActionsProps {
  onAction: (prompt: string) => void;
}

const QUICK_ACTIONS = [
  { key: 'makeShorter', promptKey: 'editor.quickActions.promptMakeShorter' },
  { key: 'changeStyle', promptKey: 'editor.quickActions.promptChangeStyle' },
  { key: 'addCaptions', promptKey: 'editor.quickActions.promptAddCaptions' },
  { key: 'improveHook', promptKey: 'editor.quickActions.promptImproveHook' },
  { key: 'changeMusic', promptKey: 'editor.quickActions.promptChangeMusic' },
];

const QuickActions: React.FC<QuickActionsProps> = ({ onAction }) => {
  const { t } = useAppTranslation();

  return (
    <div className={styles.quickActions}>
      {QUICK_ACTIONS.map((action) => (
        <Button
          key={action.key}
          theme="borderless"
          className={styles.actionBtn}
          onClick={() => onAction(t(action.promptKey))}
        >
          {t(`editor.quickActions.${action.key}`)}
        </Button>
      ))}
    </div>
  );
};

export default QuickActions;
