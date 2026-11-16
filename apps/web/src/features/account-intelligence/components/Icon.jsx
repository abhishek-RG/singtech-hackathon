// Outline icons for SingTech AI, drawn for this module (24 px grid, 1.75 stroke, currentColor).
// No icon library dependency.

const PATHS = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  table: 'M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM3 10h18M9 10v10',
  alert: 'M12 3.5 2.5 20h19L12 3.5zM12 10v4.5M12 17.2v.1',
  calendar:
    'M4 5h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM8 3v4M16 3v4M3 10h18',
  sparkle: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 15v4M17 17h4',
  globe:
    'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9s1.2-6.4 3.7-9z',
  sliders: 'M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M15 4v4M9 10v4M17 16v4',
  message: 'M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1zM8 10h8M8 13h5',
  bell: 'M6 16v-5a6 6 0 1 1 12 0v5l2 2H4zM10 20.5a2 2 0 0 0 4 0',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  plus: 'M12 5v14M5 12h14',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
  filter: 'M4 5h16l-6 7.5V19l-4-2v-4.5z',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  chevronDown: 'M6 9l6 6 6-6',
  chevronLeft: 'M15 6l-6 6 6 6',
  chevronRight: 'M9 6l6 6-6 6',
  kebab: 'M12 5.5v.1M12 12v.1M12 18.5v.1',
  menu: 'M4 7h16M4 12h16M4 17h16',
  panel: 'M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM9 4v16',
  mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3',
  send: 'M5 12l14-7-5 15-2.5-6.5z',
  thumbUp: 'M7 10v10H4V10zM7 10l4-7a2 2 0 0 1 2 2v4h5.5a2 2 0 0 1 2 2.3l-1.1 6.9a2 2 0 0 1-2 1.8H7',
  thumbDown:
    'M17 14V4h3v10zM17 14l-4 7a2 2 0 0 1-2-2v-4H5.5a2 2 0 0 1-2-2.3l1.1-6.9a2 2 0 0 1 2-1.8H17',
  copy: 'M10 9h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zM5 15V5a1 1 0 0 1 1-1h10',
  play: 'M8 5.5v13l10.5-6.5z',
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  arrowLeft: 'M19 12H5M11 6l-6 6 6 6',
  shield: 'M12 3l8 3v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6zM9 12l2 2 4-4',
  eyeOff:
    'M3 3l18 18M10.6 6.1A9.7 9.7 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-3 3.6M6.5 7.6C4 9.3 2.5 12 2.5 12s3.5 6 9.5 6a9.6 9.6 0 0 0 4-.9M9.9 9.9a3 3 0 0 0 4.2 4.2',
  users:
    'M9 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M21 20a6 6 0 0 0-3-5.2',
  log: 'M6 3h9l4 4v14H6zM15 3v4h4M9 12h6M9 16h6',
  chip: 'M8 8h8v8H8zM5 6a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1zM9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3',
  database:
    'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  pulse: 'M3 12h4l3-8 4 16 3-8h4',
  target:
    'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2z',
  layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5',
  user: 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21a8 8 0 0 1 16 0',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  close: 'M6 6l12 12M18 6L6 18',
  logOut: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  eye: 'M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
  refresh: 'M20 11a8 8 0 0 0-14.7-4.3L4 8M4 4v4h4M4 13a8 8 0 0 0 14.7 4.3L20 16M20 20v-4h-4',
  bolt: 'M13 3L5 13.5h6L10 21l8-10.5h-6z',
  file: 'M6 3h9l4 4v14H6zM15 3v4h4',
};

const FILLED = new Set(['play']);

export default function Icon({ name, size = 18, strokeWidth = 1.75, className, title }) {
  const d = PATHS[name];
  if (!d) return null;
  const filled = FILLED.has(name);
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 0 : name === 'kebab' ? 2.6 : strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : 'true'}
      role={title ? 'img' : undefined}
      focusable="false"
    >
      {title && <title>{title}</title>}
      <path d={d} />
    </svg>
  );
}

/** SingTech AI mark: red rounded square with a drawn "S" (same shape as the favicon). */
export function LogoMark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="9" style={{ fill: 'var(--st-accent)' }} />
      <path
        d="M21.2 10.6C20.1 9 18.3 8 16 8c-2.9 0-5 1.6-5 3.9 0 2.3 1.9 3.2 5 3.9 3.2.7 5.2 1.7 5.2 4.1 0 2.4-2.2 4.1-5.2 4.1-2.4 0-4.4-1-5.4-2.8"
        fill="none"
        style={{ stroke: 'var(--st-on-accent)' }}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ size = 28 }) {
  return (
    <span className="st-logo">
      <LogoMark size={size} />
      <span className="st-logo__word">SingTech AI</span>
    </span>
  );
}
