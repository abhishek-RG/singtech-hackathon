// Demo sign-in for SingTech AI. Two dummy accounts (admin, account manager); passwords are in
// docs/account-intelligence/DEMO-LOGIN.md and never shipped to the browser.

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import Button from '../../../components/Button.jsx';
import { getCurrentUser, getDemoAccounts, signIn } from '../api.js';
import Icon, { Logo } from '../components/Icon.jsx';
import { roleLabel } from '../shell/session.jsx';
import '../theme.css';
import '../shell/shell.css';
import './auth.css';

export default function SignIn() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState({ busy: false, error: null });
  const [demo, setDemo] = useState([]);
  const passwordRef = useRef(null);

  useEffect(() => {
    document.title = 'Sign in | SingTech AI';
    const controller = new AbortController();
    getCurrentUser({ signal: controller.signal })
      .then(() => navigate(next, { replace: true }))
      .catch(() => {});
    getDemoAccounts({ signal: controller.signal })
      .then(setDemo)
      .catch(() => setDemo([]));
    return () => controller.abort();
  }, [navigate, next]);

  const submit = async (event) => {
    event.preventDefault();
    setStatus({ busy: true, error: null });
    try {
      await signIn(email, password);
      navigate(next, { replace: true });
    } catch (error) {
      setStatus({ busy: false, error: error.message || 'Sign-in failed' });
    }
  };

  const fillDemo = (account) => {
    setEmail(account.email);
    setPassword('');
    setStatus({ busy: false, error: null });
    passwordRef.current?.focus();
  };

  return (
    <div className="st-root st-signin">
      <div className="st-signin__glow" aria-hidden="true" />
      <header className="st-signin__top">
        <Link to="/" className="st-signin__brand" aria-label="SingTech AI home">
          <Logo size={30} />
        </Link>
        <Link to="/" className="st-signin__back">
          Back to the product site
        </Link>
      </header>

      <main className="st-signin__card">
        <span className="st-pill st-pill--accent">Demo sign-in</span>
        <h1 className="st-signin__title">Sign in to SingTech AI</h1>
        <p className="st-signin__lead">Account intelligence for Singtel Business account teams.</p>

        <form className="st-form" onSubmit={submit} noValidate>
          <label className="st-form__field">
            <span className="st-form__label">Work email</span>
            <input
              className="st-form__input"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@singtech.example"
            />
          </label>
          <label className="st-form__field">
            <span className="st-form__label">Password</span>
            <span className="st-form__password">
              <input
                ref={passwordRef}
                className="st-form__input"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="st-form__reveal"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((v) => !v)}
              >
                <Icon name={showPassword ? 'eyeOff' : 'eye'} size={16} />
              </button>
            </span>
          </label>
          {status.error && (
            <p className="st-form__error" role="alert">
              {status.error}
            </p>
          )}
          <Button
            type="submit"
            variant="primary"
            disabled={status.busy || !email || !password}
            className="st-form__submit"
          >
            {status.busy ? 'Signing in' : 'Sign in'}
          </Button>
        </form>

        {demo.length > 0 && (
          <section className="st-demo" aria-labelledby="st-demo-title">
            <h2 id="st-demo-title" className="st-demo__title">
              Demo accounts
            </h2>
            <ul className="st-demo__list">
              {demo.map((account) => (
                <li key={account.email}>
                  <button type="button" className="st-demo__item" onClick={() => fillDemo(account)}>
                    <span
                      className={`st-tile st-tile--${account.role === 'admin' ? 'purple' : 'blue'}`}
                      aria-hidden="true"
                    >
                      <Icon name={account.role === 'admin' ? 'shield' : 'user'} size={16} />
                    </span>
                    <span className="st-demo__text">
                      <span className="st-demo__role">{roleLabel(account.role)}</span>
                      <span className="st-demo__email">{account.email}</span>
                    </span>
                    <Icon name="arrowRight" size={16} />
                  </button>
                </li>
              ))}
            </ul>
            <p className="st-demo__note">
              Dummy accounts for the demo. Passwords are in{' '}
              <code>docs/account-intelligence/DEMO-LOGIN.md</code>.
            </p>
          </section>
        )}
      </main>

      <p className="st-signin__foot">Simulated data for demo purposes.</p>
    </div>
  );
}

/** Only allow in-app paths as the post-sign-in destination. */
function safeNext(value) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/accounts';
  return value;
}
