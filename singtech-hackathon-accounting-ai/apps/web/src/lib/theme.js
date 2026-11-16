// Theme = system preference by default; an explicit choice is stored per browser.
// tokens.css reads <html data-theme="light|dark">.
const STORAGE_KEY = 'singtech-theme';

export function initTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') document.documentElement.dataset.theme = saved;
  } catch {
    // storage unavailable (private mode etc.) — fall back to system preference
  }
}

export function getTheme() {
  const explicit = document.documentElement.dataset.theme;
  if (explicit) return explicit;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // ignore
  }
}
