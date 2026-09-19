# -*- coding: utf-8 -*-
"""前端联调补丁：MediaPanel/AIChat/Editor 接线（一次性脚本）"""
import io

def patch(path, pairs):
    s = io.open(path, encoding='utf-8').read()
    for old, new in pairs:
        if old not in s:
            raise SystemExit('NOT FOUND in %s:\n%s' % (path, old[:120]))
        s = s.replace(old, new, 1)
    io.open(path, 'w', encoding='utf-8', newline='\n').write(s)
    print('patched', path)

# ---------- 1. MediaPanel：ai 工具渲染 AIChat ----------
patch('web/src/components/editor/MediaPanel/index.tsx', [
    ("import { mockAssets } from '@/utils/mockData';",
     "import { mockAssets } from '@/utils/mockData';\nimport AIChat from '@/components/editor/AIChat';"),
    ("""  if (activeTool !== 'media') {
    const toolLabel = toolLabels[activeTool];
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <span className={styles.title}>{toolLabel}</span>
        </div>
        <div className={styles.toolPlaceholder}>
          <Empty description={t('editor.panel.developing', { tool: toolLabel })} />
        </div>
      </div>
    );
  }""",
     """  if (activeTool === 'ai') {
    // AI 对话面板接入真实的对话式编辑（工单 F07）
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <span className={styles.title}>{toolLabels.ai}</span>
        </div>
        <AIChat />
      </div>
    );
  }

  if (activeTool !== 'media') {
    const toolLabel = toolLabels[activeTool];
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <span className={styles.title}>{toolLabel}</span>
        </div>
        <div className={styles.toolPlaceholder}>
          <Empty description={t('editor.panel.developing', { tool: toolLabel })} />
        </div>
      </div>
    );
  }"""),
])

# ---------- 2. AIChat：真实 chatService + QuickActions 预填 ----------
patch('web/src/components/editor/AIChat/index.tsx', [
    ("""import React, { useRef, useEffect, useState } from 'react';
import { Spin, TextArea } from '@douyinfe/semi-ui';
import { useAIChatStore } from '@/stores/aiChatStore';
import { useTimelineStore } from '@/stores/timelineStore';""",
     """import React, { useRef, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Spin, TextArea, Toast } from '@douyinfe/semi-ui';
import { useAIChatStore } from '@/stores/aiChatStore';
import { useTimelineStore } from '@/stores/timelineStore';
import { chatService } from '@/services/generateService';"""),
    ("""const AIChat: React.FC = () => {
  const { messages, isLoading, addMessage, setLoading } = useAIChatStore();
  const selectedClipId = useTimelineStore((s) => s.selectedClipId);
  const { t } = useAppTranslation();""",
     """const isMockMode = import.meta.env.VITE_API_MODE === 'mock';

const AIChat: React.FC = () => {
  const { messages, isLoading, addMessage, setLoading } = useAIChatStore();
  const selectedClipId = useTimelineStore((s) => s.selectedClipId);
  const setDSL = useTimelineStore((s) => s.setDSL);
  const { projectId } = useParams<{ projectId: string }>();
  const { t } = useAppTranslation();"""),
    ("""  const handleSend = (text: string) => {
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
  };""",
     """  const handleSend = (text: string) => {
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
          setDSL(backendToFront(resp.timeline.timelineJson as Parameters<typeof backendToFront>[0]));
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
  };"""),
    ("      <QuickActions onAction={(prompt) => handleSend(prompt)} />",
     "      <QuickActions onAction={(prompt) => setDraft(prompt)} />"),
])

# AIChat 头部加 dslAdapter import（放在 chatService import 后）
s = io.open('web/src/components/editor/AIChat/index.tsx', encoding='utf-8').read()
s = s.replace("import { chatService } from '@/services/generateService';",
              "import { chatService } from '@/services/generateService';\nimport { backendToFront } from '@/utils/dslAdapter';")
io.open('web/src/components/editor/AIChat/index.tsx', 'w', encoding='utf-8', newline='\n').write(s)
print('AIChat import ok')

print('ALL OK')
