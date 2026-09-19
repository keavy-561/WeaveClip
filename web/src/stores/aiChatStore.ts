import { create } from 'zustand';
import type { ChatMessage } from '@/types/ai';

interface AIChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  /** 输入草稿提升到 store：模板中心/快捷指令可从外部预填（工单 WO6-01） */
  draft: string;
  setDraft: (draft: string) => void;
  addMessage: (message: ChatMessage) => void;
  setLoading: (loading: boolean) => void;
  clearMessages: () => void;
}

export const useAIChatStore = create<AIChatState>((set) => ({
  messages: [],
  isLoading: false,
  draft: '',
  setDraft: (draft) => set({ draft }),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  setLoading: (loading) => set({ isLoading: loading }),
  clearMessages: () => set({ messages: [] }),
}));
