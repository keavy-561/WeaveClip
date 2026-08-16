import { create } from 'zustand';

type Theme = 'dark' | 'light';

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const getInitialTheme = (): Theme => {
  if (typeof window === 'undefined') return 'dark';
  const saved = localStorage.getItem('weaveclip-theme') as Theme | null;
  if (saved === 'dark' || saved === 'light') return saved;
  return 'dark'; // 默认深色
};

export const useThemeStore = create<ThemeState>((set) => ({
  theme: getInitialTheme(),
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('weaveclip-theme', next);
      return { theme: next };
    }),
  setTheme: (theme) => {
    localStorage.setItem('weaveclip-theme', theme);
    set({ theme });
  },
}));
