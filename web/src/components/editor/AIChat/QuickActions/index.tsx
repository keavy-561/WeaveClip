import React from 'react';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import styles from './index.module.scss';

interface QuickActionsProps {
  onAction: (prompt: string) => void;
}

const QUICK_ACTIONS = [
  { key: 'makeShorter', prompt: 'Make this video shorter and punchier.' },
  { key: 'changeStyle', prompt: 'Change the overall style of this video.' },
  { key: 'addCaptions', prompt: 'Add clean, minimal captions to this video.' },
  { key: 'improveHook', prompt: 'Make the first 3 seconds more attention-grabbing.' },
  { key: 'changeMusic', prompt: 'Use different background music with a better match.' },
];

const QuickActions: React.FC<QuickActionsProps> = ({ onAction }) => {
  const { t } = useAppTranslation();

  return (
    <div className={styles.quickActions}>
      {QUICK_ACTIONS.map((action) => (
        <button
          key={action.key}
          className={styles.actionBtn}
          onClick={() => onAction(action.prompt)}
        >
          {t(`editor.quickActions.${action.key}`)}
        </button>
      ))}
    </div>
  );
};

export default QuickActions;
