import { useState } from 'react';
import { Link, NavLink } from 'react-router';
import { APP_NAME } from '@telsing/shared';
import { getTheme, setTheme } from '../lib/theme.js';
import './Navbar.css';

// Add top-level nav entries here as pages are added.
const NAV_LINKS = [{ to: '/', label: 'Home', end: true }];

export default function Navbar({ user, onSignOut }) {
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
            T
          </span>
          {APP_NAME}
        </Link>

        <nav className="navbar__nav" aria-label="Main">
          {user && (
            <>
              <span className="navbar__user">{user.name}</span>
              <button type="button" className="navbar__signout" onClick={onSignOut}>
                Sign out
              </button>
            </>
          )}
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
