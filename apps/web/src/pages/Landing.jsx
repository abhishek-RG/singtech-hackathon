import { useCallback, useEffect, useState } from 'react';
import { APP_NAME } from '@telsing/shared';
import Button from '../components/Button.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { api } from '../lib/api.js';
import './Landing.css';

const STATUS_LABEL = {
  loading: 'Checking API…',
  ok: 'API connected',
  error: 'API not reachable',
};

function HealthCard() {
  const [health, setHealth] = useState({ status: 'loading' });

  const check = useCallback(async (signal) => {
    setHealth((h) => ({ ...h, status: 'loading' }));
    try {
      const body = await api.get('/health', { signal });
      setHealth({ status: 'ok', service: body.service, serverTime: body.time });
    } catch (err) {
      if (err.name === 'AbortError') return;
      setHealth({ status: 'error', message: err.message });
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    check(controller.signal);
    return () => controller.abort();
  }, [check]);

  return (
    <article className="card" aria-labelledby="status-title">
      <div className="card__header">
        <h2 id="status-title" className="card__title">
          System status
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => check()}
          disabled={health.status === 'loading'}
        >
          Retry
        </Button>
      </div>

      <StatusBadge status={health.status}>{STATUS_LABEL[health.status]}</StatusBadge>

      <dl className="meta">
        <div>
          <dt>Service</dt>
          <dd>{health.service ?? '—'}</dd>
        </div>
        <div>
          <dt>Server time</dt>
          <dd>{health.serverTime ? new Date(health.serverTime).toLocaleTimeString() : '—'}</dd>
        </div>
      </dl>

      {health.status === 'error' && (
        <p className="card__hint">
          Start the API with <code>npm run dev</code> (or <code>npm run dev:server</code>) and
          retry.
        </p>
      )}
    </article>
  );
}

export default function Landing() {
  return (
    <div className="container landing">
      <section className="hero">
        <p className="hero__eyebrow">AI sales copilot · Singtel Enterprise</p>
        <h1 className="hero__title">
          Welcome to <span className="hero__brand">{APP_NAME}</span>
        </h1>
        <p className="hero__tagline">
          Your AI copilot for Singtel enterprise sales: prep accounts, sharpen pitches and close
          faster.
        </p>
        <div className="hero__actions">
          <Button to="/leads">Lead Scoring Dashboard</Button>
          <Button href="#getting-started" variant="secondary">
            Get started
          </Button>
        </div>
      </section>

      <section className="landing__grid" aria-label="Project status">
        <HealthCard />

        <article className="card" id="getting-started" aria-labelledby="start-title">
          <h2 id="start-title" className="card__title">
            Getting started
          </h2>
          <ol className="steps">
            <li>
              Pages go in <code>apps/web/src/pages</code>, routes in <code>routes.jsx</code>
            </li>
            <li>
              Features go in <code>apps/web/src/features/&lt;name&gt;</code>
            </li>
            <li>
              API modules go in <code>apps/server/src/modules/&lt;name&gt;</code>
            </li>
            <li>
              Branch <code>feature/&lt;name&gt;</code>, open a PR to <code>main</code>
            </li>
          </ol>
          <p className="card__hint">Full checklists are in README.md.</p>
        </article>
      </section>
    </div>
  );
}
