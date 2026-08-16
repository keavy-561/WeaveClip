import { create } from 'zustand';
import type { Clip, Track, VideoDSL } from '@/types/timeline';

interface TimelineState {
  clips: Clip[];
  tracks: Track[];
  selectedClipId: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  zoom: number;

  // Actions
  setDSL: (dsl: VideoDSL) => void;
  selectClip: (clipId: string | null) => void;
  togglePlay: () => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setZoom: (zoom: number) => void;
  updateClip: (clipId: string, updates: Partial<Clip>) => void;
  deleteClip: (clipId: string) => void;
  reorderClips: (clipIds: string[]) => void;
  splitClip: (clipId: string, splitPoint: number) => void;
}

export const useTimelineStore = create<TimelineState>((set) => ({
  clips: [],
  tracks: [],
  selectedClipId: null,
  isPlaying: false,
  currentTime: 0,
  duration: 45,
  zoom: 1,

  setDSL: (dsl) =>
    set({
      tracks: dsl.tracks,
      duration: dsl.duration,
      clips: dsl.tracks.flatMap((t) => t.clips),
    }),

  selectClip: (clipId) => set({ selectedClipId: clipId }),

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

  setCurrentTime: (time) => set({ currentTime: time }),

  setDuration: (duration) => set({ duration }),

  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(5, zoom)) }),

  updateClip: (clipId, updates) =>
    set((state) => {
      const newTracks = state.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((c) =>
          c.id === clipId ? { ...c, ...updates } : c
        ),
      }));
      return {
        tracks: newTracks,
        clips: newTracks.flatMap((t) => t.clips),
      };
    }),

  deleteClip: (clipId) =>
    set((state) => {
      const newTracks = state.tracks.map((track) => ({
        ...track,
        clips: track.clips.filter((c) => c.id !== clipId),
      }));
      return {
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

      const newTracks = state.tracks.map((track) =>
        track.type === 'video' ? { ...track, clips: reorderedClips } : track
      );
      return {
        tracks: newTracks,
        clips: newTracks.flatMap((t) => t.clips),
      };
    }),

  splitClip: (clipId, splitPoint) =>
    set((state) => {
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
        tracks: newTracks,
        clips: newTracks.flatMap((t) => t.clips),
      };
    }),
}));
