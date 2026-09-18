import type { VideoDSL, Track, Clip } from '@/types/timeline';

/** 后端 Video DSL（§10：clip 用 start/end）与前端时间轴（clip 用 duration）互转 */

type BackendDSL = {
  version?: string;
  fps?: number;
  duration?: number;
  canvas?: { width?: number; height?: number };
  width?: number;
  height?: number;
  tracks?: Array<{
    id?: string;
    type?: string;
    name?: string;
    clips?: Array<Record<string, unknown>>;
  }>;
};

/** 后端 DSL → 前端 VideoDSL（加载） */
export const backendToFront = (dsl: BackendDSL): VideoDSL => ({
  version: dsl.version ?? '1.0',
  fps: dsl.fps ?? 30,
  duration: dsl.duration ?? 0,
  width: dsl.canvas?.width ?? dsl.width ?? 1080,
  height: dsl.canvas?.height ?? dsl.height ?? 1920,
  tracks: (dsl.tracks ?? []).map((t): Track => ({
    id: t.id ?? `t_${Math.random().toString(36).slice(2, 8)}`,
    // 后端字幕轨为 text，前端叫 caption
    type: (t.type === 'text' ? 'caption' : t.type === 'video' || t.type === 'audio' ? t.type : 'effect') as Track['type'],
    clips: (t.clips ?? []).map((c): Clip => {
      const start = Number(c.start ?? 0);
      const end = Number(c.end ?? start);
      return {
        id: String(c.id ?? ''),
        assetId: c.assetId != null ? String(c.assetId) : undefined,
        start,
        duration: Number(c.duration ?? Math.max(end - start, 0)),
        sourceStart: c.trimIn != null ? Number(c.trimIn) : undefined,
        sourceDuration: c.trimOut != null ? Number(Number(c.trimOut) - Number(c.trimIn ?? 0)) : undefined,
        speed: c.speed != null ? Number(c.speed) : undefined,
        volume: c.volume != null ? Number(c.volume) : undefined,
        text: c.text != null ? String(c.text) : undefined,
      };
    }),
  })),
});

/** 前端 VideoDSL → 后端 DSL（保存） */
export const frontToBackend = (dsl: VideoDSL): Record<string, unknown> => ({
  version: dsl.version || '1.0',
  fps: dsl.fps || 30,
  duration: dsl.duration,
  canvas: { width: dsl.width, height: dsl.height },
  tracks: (dsl.tracks ?? []).map((t) => ({
    id: t.id,
    type: t.type === 'caption' ? 'text' : t.type,
    clips: (t.clips ?? []).map((c) => {
      const sourceStart = c.sourceStart ?? 0;
      const sourceDuration = c.sourceDuration ?? c.duration ?? 0;
      return {
        id: c.id,
        assetId: c.assetId,
        type: t.type === 'video' ? 'video' : t.type === 'audio' ? 'audio' : 'text',
        start: c.start,
        end: c.start + (c.duration ?? 0),
        trimIn: sourceStart,
        trimOut: sourceStart + sourceDuration,
        speed: c.speed,
        volume: c.volume,
        text: c.text,
      };
    }),
  })),
});
