// Session for the SingTech AI workspace. RequireSession checks /auth/me and sends signed-out users
// to /sign-in, remembering where they were going.

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { getCurrentUser, signOut as apiSignOut } from '../api.js';
import { writePreference } from '../storage.js';

const SessionContext = createContext({ user: null, signOut: async () => {} });

export function useSession() {
  return useContext(SessionContext);
}

export function RequireSession({ children, fallback = null }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [state, setState] = useState({ status: 'loading', user: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    getCurrentUser({ signal: controller.signal })
      .then((user) => {
        // A hint for the landing page preview only; the session itself is the httpOnly cookie.
        writePreference('signed-in', true);
        setState({ status: 'ready', user, error: null });
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        if (error.status === 401) {
          writePreference('signed-in', false);
          const next = `${location.pathname}${location.search}`;
          navigate(`/sign-in?next=${encodeURIComponent(next)}`, { replace: true });
          return;
        }
        setState({ status: 'error', user: null, error: error.message });
      });
    return () => controller.abort();
    // The session is checked once per mount; navigation inside the shell keeps it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = useCallback(async () => {
    try {
      writePreference('signed-in', false);
      await apiSignOut();
    } finally {
      navigate('/sign-in', { replace: true });
    }
  }, [navigate]);

  if (state.status === 'error') {
    return (
      <div className="st-root st-center">
        <div className="st-card st-card--narrow" role="alert">
          <h1 className="st-h2">SingTech AI is not reachable</h1>
          <p className="st-muted">{state.error}. Check that the API is running, then reload.</p>
        </div>
      </div>
    );
  }
  if (state.status !== 'ready') return fallback;
  return (
    <SessionContext.Provider value={{ user: state.user, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}

export function roleLabel(role) {
  return role === 'admin' ? 'Admin' : 'Account Manager';
}

export function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}
