// Overview cards on the Account page: health and why, what changed, what is missing,
// the next best action, and the reserved slot for the Ask SingTech AI agent.

import { Link } from 'react-router';
import { PRODUCTS } from '@singtech/shared';
import Button from '../../../components/Button.jsx';
import { EvidenceLinks } from './Evidence.jsx';
import HealthBadge from './HealthBadge.jsx';
import { formatDate, reasonLabel, signedPoints } from '../format.js';

export function HealthCard({ health, rulesVersion }) {
  const risks = health.reasons.filter((r) => r.points < 0);
  const strengths = health.reasons.filter((r) => r.points > 0);
  return (
    <section className="card acct-card" aria-labelledby="acct-health-title">
      <header className="acct-card__header">
        <h2 id="acct-health-title" className="acct-card__title">
          Health and why
        </h2>
        <HealthBadge band={health.band} score={health.score} />
      </header>
      <p className="acct-card__lead">
        {health.top_reason
          ? `Main reason: ${reasonLabel(health.top_reason).toLowerCase()}.`
          : risks.length
            ? 'Healthy overall, with the signals below to watch.'
            : 'No risk signals in the last 180 days.'}
      </p>
      {risks.length > 0 && (
        <ul className="acct-reasons" aria-label="Risk signals">
          {risks.map((r, i) => (
            <li key={`${r.code}-${i}`} className="acct-reason">
              <span className="acct-reason__points acct-reason__points--risk">
                {signedPoints(r.points)}
              </span>
              <span className="acct-reason__body">
                <span>{r.label}</span>
                <EvidenceLinks ids={r.evidence_ids} />
              </span>
            </li>
          ))}
        </ul>
      )}
      {strengths.length > 0 && (
        <ul className="acct-reasons" aria-label="Strengths">
          {strengths.map((r, i) => (
            <li key={`${r.code}-${i}`} className="acct-reason">
              <span className="acct-reason__points acct-reason__points--strength">
                {signedPoints(r.points)}
              </span>
              <span className="acct-reason__body">
                <span>{r.label}</span>
                <EvidenceLinks ids={r.evidence_ids} />
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="acct-card__foot">
        Score starts at 100. Points come from rules (version {rulesVersion}), not AI.
      </p>
    </section>
  );
}

const DIRECTION_TAG = { negative: 'Risk', positive: 'Growth', neutral: 'Update' };

export function ChangesCard({ changes }) {
  return (
    <section className="card acct-card" aria-labelledby="acct-changes-title">
      <header className="acct-card__header">
        <h2 id="acct-changes-title" className="acct-card__title">
          What changed
        </h2>
        <span className="acct-card__meta">Last {changes.window_days} days</span>
      </header>
      {changes.events.length === 0 ? (
        <p className="acct-card__lead">No changes in the last {changes.window_days} days.</p>
      ) : (
        <ol className="acct-timeline">
          {changes.events.map((e, i) => (
            <li key={`${e.type}-${i}`} className="acct-timeline__item">
              <span className="acct-timeline__date">{formatDate(e.date)}</span>
              <span className="acct-timeline__body">
                <span className={`acct-tag acct-tag--${e.direction}`}>
                  {DIRECTION_TAG[e.direction]}
                </span>
                <span>{e.label}</span>
                <EvidenceLinks ids={e.evidence_ids} max={2} />
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function WhitespaceCard({ whitespace }) {
  const owned = new Set(whitespace.owned);
  const lacked = [...whitespace.lacked].sort((a, b) => b.weight - a.weight);
  return (
    <section className="card acct-card" aria-labelledby="acct-gap-title">
      <header className="acct-card__header">
        <h2 id="acct-gap-title" className="acct-card__title">
          What is missing
        </h2>
        <span className="acct-card__meta">
          Owns {whitespace.owned_count} of {whitespace.total_products}
        </span>
      </header>
      <ul className="acct-products" aria-label="Product coverage">
        {PRODUCTS.map((p) => (
          <li
            key={p.code}
            className={`acct-product${owned.has(p.code) ? ' acct-product--owned' : ''}`}
          >
            <span className="acct-product__mark" aria-hidden="true">
              {owned.has(p.code) ? '✓' : ''}
            </span>
            {p.name}
            <span className="acct-visually-hidden">
              {owned.has(p.code) ? ', owned' : ', not owned'}
            </span>
          </li>
        ))}
      </ul>
      {lacked.length === 0 ? (
        <p className="acct-card__lead">Owns all six products.</p>
      ) : (
        <ul className="acct-gaps">
          {lacked.map((l) => (
            <li
              key={l.product_code}
              className={`acct-gap${l.product_code === whitespace.top_gap ? ' acct-gap--top' : ''}`}
            >
              <span className="acct-gap__head">
                <strong>{l.product_name}</strong>
                {l.product_code === whitespace.top_gap && (
                  <span className="acct-tag acct-tag--positive">Best fit</span>
                )}
              </span>
              {l.signals.length ? (
                <ul className="acct-gap__signals">
                  {l.signals.map((s) => (
                    <li key={s.label}>
                      <span>{s.label}</span>
                      <EvidenceLinks ids={s.evidence_ids} max={2} />
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="acct-gap__none">No signal yet. Not recommended.</span>
              )}
            </li>
          ))}
        </ul>
      )}
      {whitespace.competitor_mentions.length > 0 && (
        <div className="acct-competitors">
          <h3 className="acct-subhead">Competitor signals</h3>
          <ul>
            {whitespace.competitor_mentions.map((m) => (
              <li key={m.case_id}>
                <span>
                  {m.alias} mentioned on {formatDate(m.opened_on)}
                </span>
                <EvidenceLinks ids={[m.case_id]} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export function NextActionCard({ nextAction, onCopy }) {
  return (
    <section className="card acct-card acct-card--action" aria-labelledby="acct-action-title">
      <header className="acct-card__header">
        <h2 id="acct-action-title" className="acct-card__title">
          Next best action
        </h2>
        <span
          className={`acct-tag acct-tag--${nextAction.kind === 'grow' ? 'positive' : 'negative'}`}
        >
          {nextAction.kind === 'grow' ? 'Grow' : 'Protect'}
        </span>
      </header>
      <p className="acct-action__title">{nextAction.label}</p>
      {nextAction.product_name && <p className="acct-action__product">{nextAction.product_name}</p>}
      {nextAction.contact && (
        <p className="acct-action__contact">
          Talk to {nextAction.contact.full_name}, {nextAction.contact.title}
        </p>
      )}
      <h3 className="acct-subhead">Talking points</h3>
      <ol className="acct-points">
        {nextAction.talking_points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ol>
      <div className="acct-draft">
        <h3 className="acct-subhead">Draft message</h3>
        <p>An AI-drafted message, grounded in these talking points, arrives in Phase 2.</p>
      </div>
      <div className="acct-action__buttons">
        <span
          className="st-tip acct-tooltip"
          data-tip="Opens in Deal desk"
          role="button"
          tabIndex={0}
          aria-disabled="true"
          aria-label="Open in Deal desk (not available yet)"
        >
          <Button variant="primary" size="sm" disabled aria-hidden="true" tabIndex={-1}>
            Open in Deal desk
          </Button>
        </span>
        <Button variant="secondary" size="sm" onClick={onCopy}>
          Copy talking points
        </Button>
      </div>
    </section>
  );
}

export function AgentPanel() {
  return (
    <section className="card acct-card acct-card--agent" aria-labelledby="acct-agent-title">
      <header className="acct-card__header">
        <h2 id="acct-agent-title" className="acct-card__title">
          Ask SingTech AI
        </h2>
        <span className="acct-tag acct-tag--neutral">Phase 2</span>
      </header>
      <p className="acct-card__lead">
        Ask about this account and get answers that cite their source records, each ending with a
        suggested next action.
      </p>
      <p className="acct-card__foot">Reserved for the account agent. Not active yet.</p>
    </section>
  );
}

export function HierarchyCard({ account, parent, children }) {
  return (
    <section className="card acct-card" aria-labelledby="acct-tree-title">
      <header className="acct-card__header">
        <h2 id="acct-tree-title" className="acct-card__title">
          Account hierarchy
        </h2>
      </header>
      {!parent && children.length === 0 ? (
        <p className="acct-card__lead">Single entity. No parent or subsidiaries on record.</p>
      ) : (
        <ul className="acct-tree">
          {parent && (
            <li>
              {parent.visible ? (
                <Link to={`/accounts/${parent.id}`}>{parent.name}</Link>
              ) : (
                parent.name
              )}
              <span className="acct-card__meta"> Group parent</span>
            </li>
          )}
          <li className={parent ? 'acct-tree__child' : undefined}>
            <strong>{account.name}</strong>
            <span className="acct-card__meta"> This account</span>
          </li>
          {children.map((c) => (
            <li key={c.id} className="acct-tree__child">
              {c.visible ? <Link to={`/accounts/${c.id}`}>{c.name}</Link> : c.name}
              <span className="acct-card__meta"> Subsidiary, {c.market}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
