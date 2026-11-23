export type ThemeMode = 'light';

const THEME_STORAGE_KEY = 'voxquest_theme';

export function getStoredTheme(): ThemeMode {
  return 'light';
}

export function applyTheme(_mode?: string) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const root = document.documentElement;
  const isPill =
    (typeof window !== 'undefined' && window.location.hash.includes('pill')) ||
    (typeof document !== 'undefined' &&
      (document.body?.classList.contains('pill-window') ||
        document.documentElement?.classList.contains('pill-window')));

  if (isPill) {
    if (document.body) {
      document.body.style.backgroundColor = 'transparent';
      document.body.style.background = 'transparent';
    }
    if (root) {
      root.style.backgroundColor = 'transparent';
      root.style.background = 'transparent';
    }
  }

  // Strictly enforce light theme throughout VoxQuest
  root.classList.remove('dark');
  root.classList.add('light');
  root.setAttribute('data-theme', 'light');
  if (!isPill && document.body) {
    document.body.style.backgroundColor = '#DFDFD4';
    document.body.style.color = '#212121';
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
  } catch {}
}

export function initThemeListener(_onThemeChange?: (isDark: boolean) => void) {
  applyTheme('light');
  return () => {};
}
