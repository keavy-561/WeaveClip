import React, { useRef, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Spin, TextArea, Toast } from '@douyinfe/semi-ui';
import { useAIChatStore } from '@/stores/aiChatStore';
import { useTimelineStore } from '@/stores/timelineStore';
import { chatService } from '@/services/generateService';
import { backendToFront } from '@/utils/dslAdapter';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import ChatMessage from './ChatMessage';
import QuickActions from './QuickActions';
import { generateId } from '@/utils/format';
import styles from './index.module.scss';

const isMockMode = import.meta.env.VITE_API_MODE === 'mock';

const AIChat: React.FC = () => {
  const { messages, isLoading, addMessage, setLoading } = useAIChatStore();
  const selectedClipId = useTimelineStore((s) => s.selectedClipId);
  const setDSL = useTimelineStore((s) => s.setDSL);
  const { projectId } = useParams<{ projectId: string }>();
  const { t } = useAppTranslation();
  const listRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);
  const [draft, setDraft] = useState('');

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

    // mock 模式：本地模拟回复；真实模式：调用对话式编辑 API（工单 F07/B13）
    if (isMockMode) {
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
      return;
    }

    void chatService.send(projectId ?? '', { message: text, selectedClipId: selectedClipId ?? null })
      .then((resp) => {
        addMessage({
          id: generateId(),
          role: 'assistant',
          content: resp.message,
          operations: resp.operations,
          timestamp: new Date().toISOString(),
        });
        // 服务端已应用 operations 并落库新版本，这里同步本地时间轴
        if (resp.timeline?.timelineJson) {
          setDSL(backendToFront(resp.timeline.timelineJson as unknown as Parameters<typeof backendToFront>[0]));
        }
      })
      .catch((error) => {
        const reason =
          (error as { response?: { data?: { message?: string } } }).response?.data?.message ?? '';
        Toast.error(t('editor.aiChat.sendFailed', { reason }));
      })
      .finally(() => {
        setLoading(false);
      });
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

      <QuickActions onAction={(prompt) => setDraft(prompt)} />

      <div className={styles.inputWrap}>
        <TextArea
          className={styles.input}
          placeholder={t('editor.aiChat.inputPlaceholder')}
          rows={2}
          autosize={{ minRows: 2, maxRows: 4 }}
          value={draft}
          onChange={(value) => setDraft(value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend(draft);
              setDraft('');
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
