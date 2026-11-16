// Per-browser preferences (filters, sort, active tab). Storage can be unavailable (private mode,
// blocked site data), so every read and write is guarded and falls back to defaults.

import { useEffect, useState } from 'react';

const PREFIX = 'singtech-ai.account-intelligence.';

export function readPreference(key, fallback) {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    const value = JSON.parse(raw);
    return isPlainObject(fallback) && isPlainObject(value) ? { ...fallback, ...value } : value;
  } catch {
    return fallback;
  }
}

export function writePreference(key, value) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage unavailable: the preference lasts for this page view only.
  }
}

/** useState that remembers its value in localStorage under `key`. */
export function usePreference(key, fallback) {
  const [value, setValue] = useState(() => readPreference(key, fallback));
  useEffect(() => writePreference(key, value), [key, value]);
  return [value, setValue];
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
