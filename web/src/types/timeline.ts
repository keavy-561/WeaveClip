export interface VideoDSL {
  version: string;
  duration: number;
  fps: number;
  width: number;
  height: number;
  tracks: Track[];
}

export interface Track {
  id: string;
  type: 'video' | 'caption' | 'audio' | 'effect';
  clips: Clip[];
}

export interface Clip {
  id: string;
  assetId?: string;
  start: number;
  duration: number;
  sourceStart?: number;
  sourceDuration?: number;
  speed?: number;
  volume?: number;
  text?: string;
  style?: CaptionStyle;
  effectType?: string;
  params?: Record<string, unknown>;
}

export interface CaptionStyle {
  font: string;
  size: number;
  color: string;
  position: 'top' | 'center' | 'bottom';
  animation: 'none' | 'fadeIn' | 'typewriter' | 'pop';
}

export type EditingOperation =
  | { operation: 'trim'; clipId: string; start: number; end: number }
  | { operation: 'replace'; clipId: string; assetId: string }
  | { operation: 'delete'; clipId: string }
  | { operation: 'reorder'; clipIds: string[] }
  | { operation: 'split'; clipId: string; splitPoint: number }
  | { operation: 'add_clip'; trackId: string; assetId: string; start: number; duration: number }
  | { operation: 'add_caption'; text: string; start: number; end: number; style?: CaptionStyle }
  | { operation: 'change_music'; assetId: string }
  | { operation: 'change_speed'; clipId: string; speed: number }
  | { operation: 'change_volume'; clipId: string; volume: number }
  | { operation: 'batch'; operations: EditingOperation[] };
