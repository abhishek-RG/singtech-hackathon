import { useCallback, useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router';
import Navbar from './components/Navbar.jsx';
import { api } from './lib/api.js';

// App shell: shared layout for every route. Pages render into <Outlet />.
export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const controller = new AbortController();
    api
      .get('/auth/session', { signal: controller.signal })
      .then((body) => setUser(body.data.user))
      .catch(() => setUser(null))
      .finally(() => setAuthLoading(false));
    return () => controller.abort();
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api.post('/auth/logout', {});
    } finally {
      setUser(null);
      navigate('/login');
    }
  }, [navigate]);

  return (
    <div className="app">
      <Navbar user={user} onSignOut={signOut} />
      <main className="app-main">
        <Outlet context={{ user, setUser, authLoading }} />
      </main>
    </div>
  );
}
