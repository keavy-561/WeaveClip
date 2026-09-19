import { create } from 'zustand';
import type { Clip, Track, VideoDSL, CaptionStyle } from '@/types/timeline';
import { useAssetsStore } from '@/stores/assetsStore';
import { mockAssets } from '@/utils/mockData';

/** 历史快照：保存恢复时间轴所需的最小字段 */
interface DSLSnapshot {
  tracks: Track[];
  duration: number;
}

/** 历史栈上限，防止长会话内存无限增长 */
const HISTORY_LIMIT = 50;

interface UpdateClipOptions {
  /** 跳过历史快照（用于 Trim 拖拽等连续更新场景，拖拽开始时手动 push 一次即可） */
  skipHistory?: boolean;
}

interface TimelineState {
  clips: Clip[];
  tracks: Track[];
  selectedClipId: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  zoom: number;
  /** 撤销栈（过去快照，栈顶为最近一次变更前的状态） */
  past: DSLSnapshot[];
  /** 重做栈（未来快照，栈顶为最近一次撤销前的状态） */
  future: DSLSnapshot[];
  canUndo: boolean;
  canRedo: boolean;

  // Actions
  setDSL: (dsl: VideoDSL) => void;
  selectClip: (clipId: string | null) => void;
  togglePlay: () => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setZoom: (zoom: number) => void;
  updateClip: (clipId: string, updates: Partial<Clip>, options?: UpdateClipOptions) => void;
  deleteClip: (clipId: string) => void;
  reorderClips: (clipIds: string[]) => void;
  splitClip: (clipId: string, splitPoint: number) => void;
  /** 在视频轨道的指定时间点创建新 clip（素材拖入时间轴） */
  addClip: (assetId: string, startTime: number) => void;
  /** 在字幕轨道的播放头位置添加字幕片段（文本面板，工单 WO6-08；轨道不存在时自动创建） */
  addCaption: (text: string, start: number, duration: number, style?: CaptionStyle) => void;
  /** 手动压入一条快照（Trim 拖拽开始时调用，保证一次拖拽只占一条历史） */
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
}

/** 生成当前状态的快照 */
const takeSnapshot = (tracks: Track[], duration: number): DSLSnapshot => ({
  tracks,
  duration,
});

export const useTimelineStore = create<TimelineState>((set) => ({
  clips: [],
  tracks: [],
  selectedClipId: null,
  isPlaying: false,
  currentTime: 0,
  duration: 45,
  zoom: 1,
  past: [],
  future: [],
  canUndo: false,
  canRedo: false,

  setDSL: (dsl) =>
    set((state) => {
      // 变更前压入快照，支持撤销回加载前的时间轴
      const past = [...state.past, takeSnapshot(state.tracks, state.duration)].slice(-HISTORY_LIMIT);
      return {
        past,
        future: [],
        canUndo: past.length > 0,
        canRedo: false,
        tracks: dsl.tracks,
        duration: dsl.duration,
        clips: dsl.tracks.flatMap((t) => t.clips),
      };
    }),

  selectClip: (clipId) => set({ selectedClipId: clipId }),

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

  setCurrentTime: (time) => set({ currentTime: time }),

  setDuration: (duration) => set({ duration }),

  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(5, zoom)) }),

  updateClip: (clipId, updates, options) =>
    set((state) => {
      // 目标片段不存在时保持原状态且不压历史，避免空操作污染撤销栈（工单 WO8-08）
      const exists = state.tracks.some((track) =>
        track.clips.some((c) => c.id === clipId)
      );
      if (!exists) return state;
      // 连续拖拽场景由调用方在开始时手动 pushHistory，这里按需跳过
      const past = options?.skipHistory
        ? state.past
        : [...state.past, takeSnapshot(state.tracks, state.duration)].slice(-HISTORY_LIMIT);
      const newTracks = state.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((c) =>
          c.id === clipId ? { ...c, ...updates } : c
        ),
      }));
      return {
        past,
        future: [],
        canUndo: past.length > 0,
        canRedo: false,
        tracks: newTracks,
        clips: newTracks.flatMap((t) => t.clips),
      };
    }),

  deleteClip: (clipId) =>
    set((state) => {
      const past = [...state.past, takeSnapshot(state.tracks, state.duration)].slice(-HISTORY_LIMIT);
      const newTracks = state.tracks.map((track) => ({
        ...track,
        clips: track.clips.filter((c) => c.id !== clipId),
      }));
      return {
        past,
        future: [],
        canUndo: past.length > 0,
        canRedo: false,
        tracks: newTracks,
        clips: newTracks.flatMap((t) => t.clips),
        selectedClipId:
          state.selectedClipId === clipId ? null : state.selectedClipId,
      };
    }),

  reorderClips: (clipIds) =>
    set((state) => {
      const videoTrack = state.tracks.find((t) => t.type === 'video');
      if (!videoTrack) return state;

      const clipMap = new Map(videoTrack.clips.map((c) => [c.id, c]));
      const reorderedClips = clipIds.map((id) => clipMap.get(id)!).filter(Boolean);

      // 按新顺序从 0 开始连续重排 start，保证拖拽换位在时间轴上真正生效
      let cursor = 0;
      const packed = reorderedClips.map((clip) => {
        const next = { ...clip, start: cursor };
        cursor += clip.duration;
        return next;
      });

      const newTracks = state.tracks.map((track) =>
        track.type === 'video' ? { ...track, clips: packed } : track
      );
      const past = [...state.past, takeSnapshot(state.tracks, state.duration)].slice(-HISTORY_LIMIT);
      return {
        past,
        future: [],
        canUndo: past.length > 0,
        canRedo: false,
        tracks: newTracks,
        clips: newTracks.flatMap((t) => t.clips),
      };
    }),

  splitClip: (clipId, splitPoint) =>
    set((state) => {
      // 片段不存在或切分点不在片段范围内时保持原状态，不压无效历史（工单 WO8-08）
      const existing = state.tracks
        .flatMap((track) => track.clips)
        .find((c) => c.id === clipId);
      if (
        !existing ||
        splitPoint <= existing.start ||
        splitPoint >= existing.start + existing.duration
      ) {
        return state;
      }
      const past = [...state.past, takeSnapshot(state.tracks, state.duration)].slice(-HISTORY_LIMIT);
      const newTracks = state.tracks.map((track) => {
        const targetClip = track.clips.find((c) => c.id === clipId);
        if (!targetClip) return track;

        const firstHalf = {
          ...targetClip,
          duration: splitPoint - targetClip.start,
        };
        const secondHalf = {
          ...targetClip,
          id: `${clipId}_split_${Date.now()}`,
          start: splitPoint,
          sourceStart: (targetClip.sourceStart ?? 0) + firstHalf.duration,
          sourceDuration:
            (targetClip.sourceDuration ?? targetClip.duration) - firstHalf.duration,
          duration: targetClip.duration - firstHalf.duration,
        };

        const idx = track.clips.findIndex((c) => c.id === clipId);
        const clips = [...track.clips];
        clips.splice(idx, 1, firstHalf, secondHalf);
        return { ...track, clips };
      });
      return {
        past,
        future: [],
        canUndo: past.length > 0,
        canRedo: false,
        tracks: newTracks,
        clips: newTracks.flatMap((t) => t.clips),
      };
    }),

  addClip: (assetId, startTime) =>
    set((state) => {
      // 优先从 assetsStore 查素材时长，查不到回退 mockAssets，最后给默认值
      const storedAssets = useAssetsStore.getState().assets;
      const asset =
        storedAssets.find((a) => a.id === assetId) ??
        mockAssets.find((a) => a.id === assetId);
      const duration = asset?.duration ?? 5;

      const newClip: Clip = {
        id: `clip_${Date.now()}`,
        assetId,
        start: Math.max(0, startTime),
        duration,
        sourceStart: 0,
        sourceDuration: duration,
      };
      // 视频轨不存在时自动创建（空时间轴/新项目）：此前直接 return 导致
      // "已添加"toast 撒谎、点素材→时间轴→检查器的编辑链路断裂
      //（走查第三轮 P1-N1，工单 WO10-01）
      const hasVideoTrack = state.tracks.some((track) => track.type === 'video');
      const insertSorted = (clips: Clip[]) =>
        [...clips, newClip].sort((a, b) => a.start - b.start);
      const newTracks = hasVideoTrack
        ? state.tracks.map((track) =>
            track.type === 'video' ? { ...track, clips: insertSorted(track.clips) } : track
          )
        : [
            { id: `video_${Date.now()}`, type: 'video' as const, clips: [newClip] },
            ...state.tracks,
          ];
      const past = [...state.past, takeSnapshot(state.tracks, state.duration)].slice(-HISTORY_LIMIT);
      return {
        past,
        future: [],
        canUndo: past.length > 0,
        canRedo: false,
        tracks: newTracks,
        clips: newTracks.flatMap((t) => t.clips),
        selectedClipId: newClip.id,
        // 时长不足以容纳新片段时自动扩展，保证标尺/画布/导出覆盖全部内容
        duration: Math.max(state.duration, newClip.start + newClip.duration),
      };
    }),

  addCaption: (text, start, duration, style) =>
    set((state) => {
      const past = [...state.past, takeSnapshot(state.tracks, state.duration)].slice(-HISTORY_LIMIT);
      const newClip: Clip = {
        id: `cap_${Date.now()}`,
        text,
        start: Math.max(0, start),
        duration,
        ...(style ? { style } : {}),
      };
      // 字幕轨：存在则按时间序插入，不存在则新建轨道（工单 WO6-08）
      const hasCaptionTrack = state.tracks.some((track) => track.type === 'caption');
      const newTracks = hasCaptionTrack
        ? state.tracks.map((track) =>
            track.type === 'caption'
              ? { ...track, clips: [...track.clips, newClip].sort((a, b) => a.start - b.start) }
              : track
          )
        : [
            ...state.tracks,
            { id: `caption_${Date.now()}`, type: 'caption' as const, clips: [newClip] },
          ];
      return {
        past,
        future: [],
        canUndo: past.length > 0,
        canRedo: false,
        tracks: newTracks,
        clips: newTracks.flatMap((t) => t.clips),
        selectedClipId: newClip.id,
      };
    }),

  pushHistory: () =>
    set((state) => {
      const past = [...state.past, takeSnapshot(state.tracks, state.duration)].slice(-HISTORY_LIMIT);
      return { past, future: [], canUndo: past.length > 0, canRedo: false };
    }),

  undo: () =>
    set((state) => {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      const future = [takeSnapshot(state.tracks, state.duration), ...state.future].slice(0, HISTORY_LIMIT);
      return {
        past: state.past.slice(0, -1),
        future,
        canUndo: state.past.length > 1,
        canRedo: true,
        tracks: previous.tracks,
        duration: previous.duration,
        clips: previous.tracks.flatMap((t) => t.clips),
        // 撤销后选中的片段可能已不存在，做一次兜底清理
        selectedClipId: previous.tracks.some((t) =>
          t.clips.some((c) => c.id === state.selectedClipId)
        )
          ? state.selectedClipId
          : null,
      };
    }),

  redo: () =>
    set((state) => {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      const past = [...state.past, takeSnapshot(state.tracks, state.duration)].slice(-HISTORY_LIMIT);
      return {
        past,
        future: state.future.slice(1),
        canUndo: past.length > 0,
        canRedo: state.future.length > 1,
        tracks: next.tracks,
        duration: next.duration,
        clips: next.tracks.flatMap((t) => t.clips),
        selectedClipId: next.tracks.some((t) =>
          t.clips.some((c) => c.id === state.selectedClipId)
        )
          ? state.selectedClipId
          : null,
      };
    }),
}));
