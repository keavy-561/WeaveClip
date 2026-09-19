import { create } from 'zustand';

/**
 * 编辑器 UI 状态（工具栏/面板切换）：
 * - activeTool：左侧 SideNavBar 当前激活的工具，MediaPanel 根据它渲染对应面板；
 *   再次点击已选中工具时切回 media
 * - activeInspectorTab：右侧检查器当前 tab，ToolSidebar 快捷按钮与
 *   InspectorPanel tab 共用同一份状态
 */
export type EditorTool = 'media' | 'record' | 'content' | 'ai' | 'text' | 'brand' | 'help';

export type InspectorTab = 'color' | 'filter' | 'adjust' | 'effect' | 'caption' | 'speed';

interface EditorUIState {
  activeTool: EditorTool;
  setActiveTool: (tool: EditorTool) => void;
  activeInspectorTab: InspectorTab;
  setInspectorTab: (tab: InspectorTab) => void;
  /** 左侧媒体面板是否折叠为窄条（工单 WO5-05） */
  mediaCollapsed: boolean;
  toggleMediaCollapsed: () => void;
  /** 右侧检查器是否折叠为窄条（工单 WO5-05） */
  inspectorCollapsed: boolean;
  toggleInspectorCollapsed: () => void;
}

export const useEditorUIStore = create<EditorUIState>((set) => ({
  activeTool: 'media',
  setActiveTool: (tool) => set({ activeTool: tool }),
  activeInspectorTab: 'color',
  setInspectorTab: (tab) => set({ activeInspectorTab: tab }),
  mediaCollapsed: false,
  toggleMediaCollapsed: () => set((s) => ({ mediaCollapsed: !s.mediaCollapsed })),
  inspectorCollapsed: false,
  toggleInspectorCollapsed: () => set((s) => ({ inspectorCollapsed: !s.inspectorCollapsed })),
}));
