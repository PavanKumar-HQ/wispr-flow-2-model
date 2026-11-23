export type ThemeMode = 'system' | 'light' | 'dark_teal';

const THEME_STORAGE_KEY = 'voxquest_theme';

export function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
  if (stored === 'light' || stored === 'dark_teal' || stored === 'system') {
    return stored;
  }
  return 'system';
}

export function applyTheme(mode: ThemeMode) {
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

  let isDark = false;
  if (mode === 'dark_teal') {
    isDark = true;
  } else if (mode === 'light') {
    isDark = false;
  } else {
    // system
    isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  if (isDark) {
    root.classList.add('dark');
    if (!isPill) {
      document.body.style.backgroundColor = '#042D2A';
      document.body.style.color = '#DFDFD4';
    }
  } else {
    root.classList.remove('dark');
    if (!isPill) {
      document.body.style.backgroundColor = '#DFDFD4';
      document.body.style.color = '#212121';
    }
  }

  localStorage.setItem(THEME_STORAGE_KEY, mode);
}

export function initThemeListener(onThemeChange?: (isDark: boolean) => void) {
  if (typeof window === 'undefined') return () => {};

  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const listener = () => {
    const currentMode = getStoredTheme();
    if (currentMode === 'system') {
      applyTheme('system');
      if (onThemeChange) onThemeChange(media.matches);
    }
  };

  if (media.addEventListener) {
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  } else if ((media as any).addListener) {
    (media as any).addListener(listener);
    return () => (media as any).removeListener(listener);
  }
  return () => {};
}

