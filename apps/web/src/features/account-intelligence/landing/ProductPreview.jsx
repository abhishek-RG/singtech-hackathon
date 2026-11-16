// Screenshot-style previews of the SingTech AI screens for the landing page.
// The Account book preview shows the same rows, totals and formatting as the Account book: a
// signed-in visitor sees their own live book; a signed-out visitor sees the admin snapshot
// generated from the same API (previewSnapshot.js). Fictional accounts from the simulated data.

import { useEffect, useMemo, useState } from 'react';
import { getAccountBook } from '../api.js';
import { sortByStake, summariseBook } from '../bookSummary.js';
import HealthBadge from '../components/HealthBadge.jsx';
import Icon, { LogoMark } from '../components/Icon.jsx';
import { formatAmount, formatDate, formatSgd, marketName, productName } from '../format.js';
import { readPreference, writePreference } from '../storage.js';
import { SNAPSHOT_ROWS } from './previewSnapshot.js';

/** Live account book rows when signed in, otherwise the generated admin snapshot. */
function usePreviewRows() {
  const [rows, setRows] = useState(SNAPSHOT_ROWS);
  useEffect(() => {
    // Only ask the API when a session is likely, so signed-out visits make no failing request.
    if (!readPreference('signed-in', false)) return undefined;
    const controller = new AbortController();
    getAccountBook({ signal: controller.signal })
      .then((data) => setRows(data.rows))
      .catch((error) => {
        if (error.name !== 'AbortError') writePreference('signed-in', false);
      });
    return () => controller.abort();
  }, []);
  return rows;
}

function Frame({ title, children, className = '' }) {
  return (
    <div className={`st-frame ${className}`} aria-hidden="true">
      <div className="st-frame__side">
        <span className="st-frame__brand">
          <LogoMark size={18} />
          <span>SingTech AI</span>
        </span>
        <span className="st-frame__nav is-active">
          <Icon name="table" size={13} /> Account book
        </span>
        <span className="st-frame__nav">
          <Icon name="alert" size={13} /> At risk
        </span>
        <span className="st-frame__nav">
          <Icon name="calendar" size={13} /> Renewals
        </span>
        <span className="st-frame__nav">
          <Icon name="sparkle" size={13} /> Ask SingTech AI
        </span>
      </div>
      <div className="st-frame__main">
        <div className="st-frame__bar">
          <span className="st-frame__title">{title}</span>
          <span className="st-pill st-pill--sim">
            <span className="st-pill__dot" aria-hidden="true" />
            Simulated data
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}

export function BookPreview() {
  const rows = usePreviewRows();
  const summary = useMemo(() => summariseBook(rows), [rows]);
  const top = useMemo(() => sortByStake(rows).slice(0, 5), [rows]);
  return (
    <Frame title="Account book" className="st-frame--book">
      <div className="st-frame__tiles">
        <span>
          <small>Accounts</small>
          <b>{summary.count}</b>
        </span>
        <span>
          <small>At risk</small>
          <b className={summary.atRisk ? 'is-danger' : undefined}>{summary.atRisk}</b>
        </span>
        <span>
          <small>Revenue at stake</small>
          <b>{formatSgd(summary.stake)}</b>
        </span>
      </div>
      <div className="st-frame__table">
        <div className="st-frame__row st-frame__row--head">
          <span>Account</span>
          <span>Health</span>
          <span>Contract end</span>
          <span className="is-num">At stake (SGD)</span>
          <span>Next action</span>
        </div>
        {top.map((r) => (
          <div key={r.id} className="st-frame__row">
            <span className="st-frame__name">
              <span className="st-frame__cut">{r.name}</span>
              <small>{marketName(r.market)}</small>
            </span>
            <span>
              <HealthBadge band={r.health.band} score={r.health.score} size="sm" />
            </span>
            <span>{formatDate(r.contract_runway?.end_date)}</span>
            <span className="is-num">{formatAmount(r.revenue_at_stake_sgd)}</span>
            <span className="st-frame__action">
              <span className="st-frame__cut">{r.next_action.label}</span>
              {r.next_action.product_code && (
                <small>{productName(r.next_action.product_code)}</small>
              )}
            </span>
          </div>
        ))}
      </div>
    </Frame>
  );
}

export function AccountPreview() {
  return (
    <Frame title="Kestrelwick Precision Pte Ltd" className="st-frame--account">
      <div className="st-frame__highlights">
        <span>
          <small>Owner</small>Daniel Koh
        </span>
        <span>
          <small>Health</small>
          <HealthBadge band="at_risk" score={27} size="sm" />
        </span>
        <span>
          <small>Customer for</small>10 y 7 m
        </span>
        <span>
          <small>Contract end</small>30 Apr 2027
        </span>
        <span>
          <small>Revenue at stake</small>SGD 414,000
        </span>
      </div>
      <div className="st-frame__path">
        <span>At risk? Yes</span>
        <span>Main reason: Service issues</span>
        <span className="is-result">Service recovery plan: 5G+</span>
      </div>
      <div className="st-frame__cards">
        <div className="st-frame__card">
          <b>Health and why</b>
          <p>
            <em>-15</em> Competitor A mentioned in case C-0403
          </p>
          <p>
            <em>-12</em> Critical outage case C-0401
          </p>
          <p>
            <em>-12</em> High outage case C-0402
          </p>
        </div>
        <div className="st-frame__card">
          <b>What is missing</b>
          <p>5G+ (best fit): 4 incidents at operational sites</p>
          <p>Cyber Security: no signal yet</p>
        </div>
        <div className="st-frame__card st-frame__card--action">
          <b>Next best action</b>
          <p className="st-frame__big">Service recovery plan</p>
          <p>Acknowledge the 4 severe incidents and share the root causes.</p>
        </div>
      </div>
    </Frame>
  );
}
