import React from 'react';
import styles from './index.module.scss';

interface QuickActionsProps {
  onAction: (prompt: string) => void;
}

const QUICK_ACTIONS = [
  { label: 'Make shorter', prompt: 'Make this video shorter and punchier.' },
  { label: 'Change style', prompt: 'Change the overall style of this video.' },
  { label: 'Add captions', prompt: 'Add clean, minimal captions to this video.' },
  { label: 'Improve hook', prompt: 'Make the first 3 seconds more attention-grabbing.' },
  { label: 'Change music', prompt: 'Use different background music with a better match.' },
];

const QuickActions: React.FC<QuickActionsProps> = ({ onAction }) => {
  return (
    <div className={styles.quickActions}>
      {QUICK_ACTIONS.map((action) => (
        <button
          key={action.label}
          className={styles.actionBtn}
          onClick={() => onAction(action.prompt)}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
};

export default QuickActions;
