import React from 'react';
import type { ChatMessage as ChatMessageType } from '@/types/ai';
import styles from './index.module.scss';

interface ChatMessageProps {
  message: ChatMessageType;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`${styles.message} ${isUser ? styles.user : styles.assistant}`}>
      {!isUser && (
        <div className={styles.avatar}>
          <svg viewBox="0 0 20 20" width="14" height="14" fill="none">
            <circle cx="10" cy="10" r="8" stroke="white" strokeWidth="1.5" />
            <circle cx="7" cy="9" r="1" fill="white" />
            <circle cx="13" cy="9" r="1" fill="white" />
            <path d="M7 12.5c1 1 5 1 6 0" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </div>
      )}
      <div className={styles.bubble}>
        <p className={styles.content}>{message.content}</p>
        {message.operations && message.operations.length > 0 && (
          <div className={styles.operations}>
            {message.operations.map((op, i) => (
              <span key={i} className={styles.opTag}>
                {op.operation}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
