import { create } from 'zustand';
import type { Asset } from '@/types/asset';

/**
 * 编辑器素材缓存：
 * 真实 API 模式下由调用方把 assetService.list 的结果写入，
 * Timeline/Clip、MediaPanel 等优先从这里按 assetId 查素材，
 * 查不到时各自回退 mockAssets（保证 mock 模式可用）。
 */
interface AssetsState {
  assets: Asset[];
  setAssets: (assets: Asset[]) => void;
}

export const useAssetsStore = create<AssetsState>((set) => ({
  assets: [],
  setAssets: (assets) => set({ assets }),
}));
