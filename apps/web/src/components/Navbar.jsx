import { useState } from 'react';
import { Link, NavLink } from 'react-router';
import { APP_NAME } from '@singtech/shared';
import { getTheme, setTheme } from '../lib/theme.js';
import './Navbar.css';

// Add top-level nav entries here as pages are added.
const NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/accounts', label: 'Accounts' },
];

export default function Navbar() {
  const [theme, setThemeState] = useState(getTheme);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    setThemeState(next);
  };

  return (
    <header className="navbar">
      <div className="container navbar__inner">
        <Link to="/" className="navbar__brand" aria-label={`${APP_NAME} home`}>
          <span className="navbar__logo" aria-hidden="true">
            S
          </span>
          {APP_NAME}
        </Link>

        <nav className="navbar__nav" aria-label="Main">
          {NAV_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className="navbar__link">
              {link.label}
            </NavLink>
          ))}
          <button
            type="button"
            className="navbar__theme"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title="Toggle theme"
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </nav>
      </div>
    </header>
  );
}
