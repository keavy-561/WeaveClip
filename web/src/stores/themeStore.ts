import { create } from 'zustand';

type Theme = 'dark' | 'light';

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const getInitialTheme = (): Theme => {
  if (typeof window === 'undefined') return 'dark';
  try {
    const saved = localStorage.getItem('weaveclip-theme') as Theme | null;
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    // localStorage may be unavailable in some environments
  }
  return 'dark';
};

export const useThemeStore = create<ThemeState>((set) => ({
  theme: getInitialTheme(),
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('weaveclip-theme', next);
      } catch {
        // ignore localStorage errors
      }
      return { theme: next };
    }),
  setTheme: (theme) => {
    try {
      localStorage.setItem('weaveclip-theme', theme);
    } catch {
      // ignore localStorage errors
    }
    set({ theme });
  },
}));
