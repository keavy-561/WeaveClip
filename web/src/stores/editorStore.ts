import { create } from 'zustand';

interface EditorState {
  rightPanel: 'chat' | 'inspector';
  isExportDialogOpen: boolean;
  setRightPanel: (panel: 'chat' | 'inspector') => void;
  setExportDialogOpen: (open: boolean) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  rightPanel: 'chat',
  isExportDialogOpen: false,
  setRightPanel: (panel) => set({ rightPanel: panel }),
  setExportDialogOpen: (open) => set({ isExportDialogOpen: open }),
}));
