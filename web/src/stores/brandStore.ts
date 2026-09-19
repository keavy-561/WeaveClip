import { create } from 'zustand';

/** 品牌套件设置（工单 WO6-09）：名称作播放器水印，主色作字幕默认色 */
export interface BrandSettings {
  name: string;
  primaryColor: string;
  secondaryColor: string;
}

interface BrandState {
  brand: BrandSettings;
  setBrand: (patch: Partial<BrandSettings>) => void;
}

const STORAGE_KEY = 'weaveclip-brand';

/** Morandi 基准色（对齐 design-system 的 slate blue / dusty rose） */
export const BRAND_PALETTE = [
  '#899AAB',
  '#D18E85',
  '#A8C0BB',
  '#E8D3B5',
  '#5D6B7A',
  '#F1F1EF',
  '#222222',
  '#FFFFFF',
];

const DEFAULT_BRAND: BrandSettings = {
  name: '',
  primaryColor: '#899AAB',
  secondaryColor: '#D18E85',
};

const loadInitial = (): BrandSettings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_BRAND, ...JSON.parse(raw) };
    }
  } catch {
    // localStorage 不可用时使用默认值
  }
  return DEFAULT_BRAND;
};

export const useBrandStore = create<BrandState>((set) => ({
  brand: loadInitial(),
  setBrand: (patch) =>
    set((state) => {
      const brand = { ...state.brand, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(brand));
      } catch {
        // 持久化失败不影响本次会话内生效
      }
      return { brand };
    }),
}));
