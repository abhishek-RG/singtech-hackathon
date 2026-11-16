import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router';
import { APP_NAME } from '@telsing/shared';
import { api } from '../lib/api.js';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const { user, setUser, authLoading } = useOutletContext();
  const [email, setEmail] = useState('advisor@telsing.demo');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && user) navigate('/workspace', { replace: true });
  }, [authLoading, navigate, user]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      setUser(response.data.user);
      navigate('/workspace', { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to sign in. Check your sign-in details.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-page__ambient" aria-hidden="true" />
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-card__brand">
          <span className="login-card__logo">T</span>
          <span>{APP_NAME}</span>
        </div>
        <p className="login-card__eyebrow">SINGTEL ENTERPRISE · SALES INTELLIGENCE</p>
        <h1 id="login-title">Welcome back</h1>
        <p className="login-card__intro">
          Sign in to your customer workspace and continue with the full relationship context.
        </p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="email">Work email</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          {error && (
            <p className="login-form__error" role="alert">
              {error}
            </p>
          )}
          <button className="login-form__submit" type="submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
            <span aria-hidden="true">→</span>
          </button>
        </form>
        <p className="login-card__footnote">Authorized access only</p>
      </section>
      <aside className="login-pitch" aria-label="Copilot overview">
        <div className="login-pitch__mark">✳</div>
        <p className="login-pitch__eyebrow">KNOW THE ACCOUNT. MOVE THE DEAL.</p>
        <h2>Every conversation builds on the last.</h2>
        <p>
          Bring customer history and verified Singtel knowledge into one place, ready when your next
          conversation starts.
        </p>
        <div className="login-pitch__signals">
          <span>Customer lifetime view</span>
          <span>Source-backed answers</span>
          <span>Live sales guidance</span>
        </div>
      </aside>
    </div>
  );
}
