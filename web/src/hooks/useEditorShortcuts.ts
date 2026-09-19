import { useEffect } from 'react';
import { useTimelineStore } from '@/stores/timelineStore';

/** 判断事件目标是否处于文本输入场景（输入框/文本域/可编辑区域），此时不响应快捷键 */
const isEditableTarget = (el: EventTarget | null): boolean => {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    el.isContentEditable ||
    el.closest('[contenteditable="true"]') !== null
  );
};

/**
 * 编辑器键盘快捷键（Phase 6 / 工单 F11）：
 * - Space：播放/暂停（焦点在按钮等可交互元素上时不抢占）
 * - Delete / Backspace：删除选中片段
 * - Ctrl/Cmd+Z：撤销；Ctrl/Cmd+Shift+Z 或 Ctrl/Cmd+Y：重做
 *
 * 只负责在编辑器内挂载全局监听；由使用方（Editor 页面）在组件里调用。
 */
export const useEditorShortcuts = (): void => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      const store = useTimelineStore.getState();
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (e.code === 'Space' && !mod) {
        // 焦点在按钮/伪按钮上时保留原生空格激活行为，避免一次按键触发两个动作
        if (e.target instanceof HTMLElement && e.target.closest('button, [role="button"]')) {
          return;
        }
        e.preventDefault();
        store.togglePlay();
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && !mod) {
        if (store.selectedClipId) {
          e.preventDefault();
          store.deleteClip(store.selectedClipId);
        }
        return;
      }

      if (mod && key === 'z' && !e.shiftKey) {
        e.preventDefault();
        store.undo();
        return;
      }

      if (mod && ((key === 'z' && e.shiftKey) || key === 'y')) {
        e.preventDefault();
        store.redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
};
