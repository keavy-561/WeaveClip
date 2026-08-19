import React, { useRef, useEffect } from 'react';
import { Spin } from '@douyinfe/semi-ui';
import { useAIChatStore } from '@/stores/aiChatStore';
import { useTimelineStore } from '@/stores/timelineStore';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import ChatMessage from './ChatMessage';
import QuickActions from './QuickActions';
import { generateId } from '@/utils/format';
import styles from './index.module.scss';

const AIChat: React.FC = () => {
  const { messages, isLoading, addMessage, setLoading } = useAIChatStore();
  const selectedClipId = useTimelineStore((s) => s.selectedClipId);
  const { t } = useAppTranslation();
  const listRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // 自动滚动到底部
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length, isLoading]);

  const handleSend = (text: string) => {
    if (!text.trim() || isLoading) return;

    addMessage({
      id: generateId(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    });
    setLoading(true);

    // Phase 0: Mock AI 响应
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      addMessage({
        id: generateId(),
        role: 'assistant',
        content: mockAIReply(text, selectedClipId),
        timestamp: new Date().toISOString(),
      });
      setLoading(false);
      timerRef.current = null;
    }, 1200);
  };

  return (
    <div className={styles.chat}>
      <div className={styles.header}>
        <span className={styles.title}>{t('editor.aiChat.title')}</span>
        <span className={styles.contextHint}>
          {selectedClipId ? t('editor.aiChat.contextHintSelected', { id: selectedClipId }) : t('editor.aiChat.contextHintNone')}
        </span>
      </div>

      <div className={styles.messageList} ref={listRef}>
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {isLoading && (
          <div className={styles.loadingRow}>
            <Spin size="small" />
            <span className={styles.loadingText}>{t('editor.aiChat.loadingText')}</span>
          </div>
        )}
      </div>

      <QuickActions onAction={(prompt) => handleSend(prompt)} />

      <div className={styles.inputWrap}>
        <textarea
          className={styles.input}
          placeholder={t('editor.aiChat.inputPlaceholder')}
          rows={2}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              const target = e.currentTarget;
              handleSend(target.value);
              target.value = '';
            }
          }}
        />
      </div>
    </div>
  );
};

// Mock AI 回复
function mockAIReply(userText: string, selectedClipId: string | null): string {
  if (selectedClipId) {
    return `I'll edit the selected clip (${selectedClipId}) based on your request: "${userText}". This targeted edit will be applied in Phase 3.`;
  }
  return `Got it: "${userText}". I'll adjust the timeline accordingly. (This is a mock response — AI editing lands in Phase 3.)`;
}

export default AIChat;
