import { create } from 'zustand';

interface ThemeState {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
}

export const useThemeStore = create<ThemeState>((set) => {
  const savedTheme = typeof window !== 'undefined' 
    ? (localStorage.getItem('airship_theme') as 'dark' | 'light') || 'dark'
    : 'dark';

  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  return {
    theme: savedTheme,
    toggleTheme: () =>
      set((state) => {
        const next = state.theme === 'dark' ? 'light' : 'dark';
        if (typeof window !== 'undefined') {
          localStorage.setItem('airship_theme', next);
          document.documentElement.setAttribute('data-theme', next);
        }
        return { theme: next };
      }),
    setTheme: (theme) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('airship_theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
      }
      set({ theme });
    }
  };
});

