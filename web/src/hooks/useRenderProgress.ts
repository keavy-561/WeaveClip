import { useEffect, useState } from 'react';
import { renderService } from '@/services/generateService';

export type RenderPhase = 'idle' | 'rendering' | 'completed' | 'failed';

interface RenderProgressState {
  phase: RenderPhase;
  progress: number;
  downloadUrl: string;
  error: string;
}

/** 渲染进度：WebSocket 实时推送 + 轮询兜底（工单 F10，后端 B19） */
export const useRenderProgress = (renderId: string | null): RenderProgressState => {
  const [state, setState] = useState<RenderProgressState>({
    phase: 'idle',
    progress: 0,
    downloadUrl: '',
    error: '',
  });

  useEffect(() => {
    if (!renderId) return;
    let ws: WebSocket | null = null;
    let pollTimer = 0;
    let stopped = false;

    const stopAll = () => {
      stopped = true;
      if (pollTimer) window.clearInterval(pollTimer);
      ws?.close();
      ws = null;
    };

    const applyStatus = (r: { status?: string; progress?: number; downloadUrl?: string; error?: string }) => {
      if (r.progress != null) {
        setState((prev) => ({ ...prev, progress: r.progress ?? prev.progress }));
      }
      if (r.downloadUrl) setState((prev) => ({ ...prev, downloadUrl: r.downloadUrl as string }));
      if (r.error) setState((prev) => ({ ...prev, error: r.error as string }));
      if (r.status === 'completed') {
        setState((prev) => ({ ...prev, phase: 'completed', progress: 100 }));
        stopAll();
      } else if (r.status === 'failed') {
        setState((prev) => ({ ...prev, phase: 'failed' }));
        stopAll();
      } else if (r.status) {
        setState((prev) => ({ ...prev, phase: 'rendering' }));
      }
    };

    // 轮询兜底（WS 断开/消息丢失时保证进度可见）
    const startPolling = () => {
      if (pollTimer) return;
      pollTimer = window.setInterval(async () => {
        try {
          const r = await renderService.status(renderId) as { status?: string; progress?: number; downloadUrl?: string; error?: string };
          applyStatus(r);
        } catch {
          // 忽略单次轮询失败
        }
      }, 1500);
    };

    // WebSocket 实时推送
    try {
      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const token = localStorage.getItem('weaveclip-token') ?? '';
      ws = new WebSocket(`${proto}://${window.location.host}/ws/render/${renderId}?token=${encodeURIComponent(token)}`);
      ws.onmessage = (event) => {
        try {
          applyStatus(JSON.parse(event.data));
        } catch {
          // 非法消息忽略
        }
      };
      ws.onerror = () => startPolling();
      ws.onopen = () => setState((prev) => ({ ...prev, phase: 'rendering' }));
    } catch {
      // WebSocket 不可用时完全依赖轮询
    }
    startPolling();

    return stopAll;
  }, [renderId]);

  return state;
};
