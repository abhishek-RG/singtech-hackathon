// Account page: the 360 view of one existing customer, in the Salesforce record-page style.
// Highlights header, the decision path, then tabs: an Overview (health and why, what changed,
// what is missing, next best action, Ask SingTech AI slot) and related lists.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import Button from '../../components/Button.jsx';
import { getAccount } from './api.js';
import {
  EMPTY,
  buildEvidenceIndex,
  formatDate,
  formatRunway,
  formatSgd,
  formatTenure,
  humanise,
  marketName,
  productName,
  roleLabel,
  segmentLabel,
} from './format.js';
import { usePreference } from './storage.js';
import { EvidenceDialog, EvidenceProvider } from './components/Evidence.jsx';
import HealthBadge from './components/HealthBadge.jsx';
import {
  AgentPanel,
  ChangesCard,
  HealthCard,
  HierarchyCard,
  NextActionCard,
  WhitespaceCard,
} from './components/InsightCards.jsx';
import useActiveIndicator from './components/useActiveIndicator.js';
import RelatedTable from './components/RelatedTable.jsx';
import { usePageTitle } from './shell/WorkspaceShell.jsx';
import { useToast } from './components/Toast.jsx';
import './AccountIntelligence.css';

const RENEWAL_WINDOW_DAYS = 120;

export default function AccountDetail() {
  const { accountId } = useParams();
  const [state, setState] = useState({ status: 'loading', data: null, error: null });
  const [tab, setTab] = usePreference('account-tab', 'overview');
  const [evidenceId, setEvidenceId] = useState(null);
  const [toastElement, showToast] = useToast();

  const load = useCallback(
    async (signal) => {
      setState({ status: 'loading', data: null, error: null });
      try {
        const data = await getAccount(accountId, { signal });
        setState({ status: 'ready', data, error: null });
      } catch (error) {
        if (error.name === 'AbortError') return;
        setState({
          status: error.status === 404 ? 'not_found' : 'error',
          data: null,
          error: error.message,
        });
      }
    },
    [accountId],
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  usePageTitle('Account', state.data?.account.name ?? 'Account');

  const evidenceIndex = useMemo(() => buildEvidenceIndex(state.data), [state.data]);

  if (state.status === 'not_found') {
    return (
      <div className="acct-page st-page">
        <BackLink />
        <div className="card acct-message">
          <h1 className="acct-message__title">Account not found</h1>
          <p className="text-muted">
            This account is not in the account book. It may have been removed, or the link is wrong.
          </p>
          <Button to="/accounts" variant="secondary" size="sm">
            Open the account book
          </Button>
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="acct-page st-page">
        <BackLink />
        <div className="card acct-message" role="alert">
          <h1 className="acct-message__title">This account could not load</h1>
          <p className="text-muted">
            {state.error}. Check that the API is running, then try again.
          </p>
          <Button variant="secondary" size="sm" onClick={() => load()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  if (state.status === 'loading') return <AccountSkeleton />;

  const d = state.data;
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'services', label: 'Services', count: d.assets.length },
    { id: 'contracts', label: 'Contracts', count: d.contracts.length },
    { id: 'cases', label: 'Cases', count: d.cases.length },
    { id: 'activities', label: 'Activities', count: d.activities.length },
    { id: 'opportunities', label: 'Opportunities', count: d.opportunities.length },
    { id: 'stakeholders', label: 'Stakeholders', count: d.contacts.length },
  ];
  const activeTab = tabs.some((t) => t.id === tab) ? tab : 'overview';

  const copyTalkingPoints = async () => {
    const text = [
      `${d.account.name}: ${d.next_action.label}${d.next_action.product_name ? ` (${d.next_action.product_name})` : ''}`,
      ...d.next_action.talking_points.map((p, i) => `${i + 1}. ${p}`),
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      showToast('Talking points copied');
    } catch {
      showToast('Copy is blocked in this browser. Select the text instead.');
    }
  };

  return (
    <EvidenceProvider index={evidenceIndex} onOpen={setEvidenceId}>
      <div className="acct-page st-page">
        <BackLink />
        <Highlights detail={d} />
        <DecisionPath path={d.next_action.path} action={d.next_action} />
        <Tabs tabs={tabs} active={activeTab} onChange={setTab} />

        <div
          key={activeTab}
          role="tabpanel"
          id={`acct-panel-${activeTab}`}
          aria-labelledby={`acct-tab-${activeTab}`}
          className="acct-panel"
        >
          {activeTab === 'overview' && (
            <div className="acct-overview">
              <div className="acct-overview__side">
                <NextActionCard nextAction={d.next_action} onCopy={copyTalkingPoints} />
                <AgentPanel />
              </div>
              <div className="acct-overview__main">
                <HealthCard health={d.health} rulesVersion={d.rules_version} />
                <ChangesCard changes={d.changes} />
                <WhitespaceCard whitespace={d.whitespace} />
                <HierarchyCard account={d.account} parent={d.parent} children={d.children} />
              </div>
            </div>
          )}
          {activeTab === 'services' && <ServicesList detail={d} />}
          {activeTab === 'contracts' && <ContractsList contracts={d.contracts} />}
          {activeTab === 'cases' && <CasesList cases={d.cases} sites={d.sites} />}
          {activeTab === 'activities' && (
            <ActivitiesList activities={d.activities} contacts={d.contacts} />
          )}
          {activeTab === 'opportunities' && <OpportunitiesList opportunities={d.opportunities} />}
          {activeTab === 'stakeholders' && <StakeholdersList contacts={d.contacts} />}
        </div>

        <EvidenceDialog
          accountId={d.account.id}
          evidenceId={evidenceId}
          onClose={() => setEvidenceId(null)}
        />
        {toastElement}
      </div>
    </EvidenceProvider>
  );
}

function BackLink() {
  return (
    <Link to="/accounts" className="acct-back">
      Back to Account book
    </Link>
  );
}

function Highlights({ detail: d }) {
  const runway = d.contract_runway;
  return (
    <header className="acct-highlights">
      <div className="acct-highlights__top">
        <div>
          <p className="acct-eyebrow">
            {segmentLabel(d.account.segment)} account · {marketName(d.account.market)} ·{' '}
            {d.account.industry}
          </p>
          <h1 className="acct-title">{d.account.name}</h1>
          {d.parent && (
            <p className="acct-highlights__parent">
              Part of{' '}
              {d.parent.visible ? (
                <Link to={`/accounts/${d.parent.id}`}>{d.parent.name}</Link>
              ) : (
                d.parent.name
              )}
            </p>
          )}
        </div>
      </div>
      <dl className="acct-facts">
        <Fact label="Owner" value={d.account.owner_name} />
        <Fact label="Segment" value={segmentLabel(d.account.segment)} />
        <Fact
          label="Health"
          value={<HealthBadge band={d.health.band} score={d.health.score} size="sm" />}
        />
        <Fact
          label="Customer for"
          value={formatTenure(d.tenure)}
          hint={d.tenure ? `since ${formatDate(d.tenure.since)}` : null}
        />
        <Fact
          label="Contract end"
          value={formatDate(runway?.end_date)}
          hint={runway ? formatRunway(runway.days) : null}
          warn={runway && runway.days <= RENEWAL_WINDOW_DAYS}
        />
        <Fact
          label="Revenue at stake"
          value={formatSgd(d.revenue.revenue_at_stake_sgd)}
          hint={`${Math.round(d.revenue.weight * 100)}% of ${formatSgd(d.revenue.arr_sgd)} a year`}
        />
        <Fact
          label="Products"
          value={`${d.whitespace.owned_count} of ${d.whitespace.total_products}`}
        />
      </dl>
    </header>
  );
}

function Fact({ label, value, hint, warn }) {
  return (
    <div className="acct-fact">
      <dt>{label}</dt>
      <dd>
        <span className="acct-fact__value">{value ?? EMPTY}</span>
        {hint && (
          <span className={`acct-fact__hint${warn ? ' acct-row__sub--warning' : ''}`}>{hint}</span>
        )}
      </dd>
    </div>
  );
}

function DecisionPath({ path, action }) {
  return (
    <nav className="acct-path" aria-label="How the next best action was chosen">
      <ol>
        {path.map((step) => (
          <li key={step.question} className="acct-path__step">
            <span className="acct-path__q">{step.question}</span>
            <span className="acct-path__a">{step.answer}</span>
          </li>
        ))}
        <li className="acct-path__step acct-path__step--result" aria-current="step">
          <span className="acct-path__q">Next best action</span>
          <span className="acct-path__a">
            {action.label}
            {action.product_name ? `: ${action.product_name}` : ''}
          </span>
        </li>
      </ol>
    </nav>
  );
}

function Tabs({ tabs, active, onChange }) {
  const listRef = useRef(null);
  const indicator = useActiveIndicator(listRef, '.acct-tab[aria-selected="true"]', [
    active,
    tabs.length,
  ]);
  const refs = useRef({});
  const onKeyDown = (event) => {
    const i = tabs.findIndex((t) => t.id === active);
    const next = {
      ArrowRight: tabs[(i + 1) % tabs.length],
      ArrowLeft: tabs[(i - 1 + tabs.length) % tabs.length],
      Home: tabs[0],
      End: tabs[tabs.length - 1],
    }[event.key];
    if (!next) return;
    event.preventDefault();
    onChange(next.id);
    refs.current[next.id]?.focus();
  };
  return (
    <div
      ref={listRef}
      className={`acct-tabs${indicator.box ? ' has-indicator' : ''}`}
      role="tablist"
      aria-label="Account sections"
      onKeyDown={onKeyDown}
    >
      {indicator.box && (
        <span
          className={`acct-tabs__indicator${indicator.ready ? ' is-ready' : ''}`}
          aria-hidden="true"
          style={{ width: indicator.box.w, transform: `translateX(${indicator.box.x}px)` }}
        />
      )}
      {tabs.map((t) => (
        <button
          key={t.id}
          ref={(el) => {
            refs.current[t.id] = el;
          }}
          type="button"
          role="tab"
          id={`acct-tab-${t.id}`}
          aria-selected={t.id === active}
          aria-controls={`acct-panel-${t.id}`}
          tabIndex={t.id === active ? 0 : -1}
          className="acct-tab"
          onClick={() => onChange(t.id)}
        >
          {t.label}
          {t.count !== undefined && <span className="acct-view__count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

// ---------- Related lists ----------

function ServicesList({ detail: d }) {
  const sites = new Map(d.sites.map((s) => [s.id, s]));
  return (
    <RelatedTable
      caption="Installed Singtel services"
      empty="No services on record."
      rows={d.assets}
      columns={[
        { key: 'product', label: 'Product', render: (a) => <strong>{a.product_name}</strong> },
        { key: 'site', label: 'Site', render: (a) => sites.get(a.site_id)?.name ?? EMPTY },
        { key: 'status', label: 'Status', render: (a) => <StatusText value={a.status} /> },
        { key: 'start', label: 'Since', render: (a) => formatDate(a.start_date) },
        { key: 'tenure', label: 'Tenure', numeric: true, render: (a) => formatTenure(a.tenure) },
        {
          key: 'monthly',
          label: 'Monthly value',
          numeric: true,
          render: (a) => formatSgd(a.monthly_value_sgd),
        },
        {
          key: 'change',
          label: 'Last change',
          render: (a) =>
            a.change_type ? (
              <span className="acct-stack">
                {humanise(a.change_type)}
                <span className="acct-row__sub">{formatDate(a.changed_on)}</span>
              </span>
            ) : (
              EMPTY
            ),
        },
      ]}
    />
  );
}

function ContractsList({ contracts }) {
  return (
    <RelatedTable
      caption="Contracts"
      empty="No contracts on record."
      rows={contracts}
      columns={[
        { key: 'number', label: 'Contract', render: (c) => <strong>{c.contract_number}</strong> },
        {
          key: 'products',
          label: 'Products',
          render: (c) => c.product_codes.map(productName).join(', '),
        },
        { key: 'start', label: 'Start', render: (c) => formatDate(c.start_date) },
        {
          key: 'end',
          label: 'End',
          render: (c) => (
            <span className="acct-stack">
              {formatDate(c.end_date)}
              <span
                className={`acct-row__sub${c.days_to_end >= 0 && c.days_to_end <= RENEWAL_WINDOW_DAYS ? ' acct-row__sub--warning' : ''}`}
              >
                {c.days_to_end >= 0 ? formatRunway(c.days_to_end) : 'ended'}
              </span>
            </span>
          ),
        },
        { key: 'term', label: 'Term', numeric: true, render: (c) => `${c.term_months} months` },
        {
          key: 'value',
          label: 'Total value',
          numeric: true,
          render: (c) => formatSgd(c.total_value_sgd),
        },
        { key: 'status', label: 'Status', render: (c) => <StatusText value={c.status} /> },
      ]}
    />
  );
}

function CasesList({ cases, sites }) {
  const siteById = new Map(sites.map((s) => [s.id, s]));
  return (
    <RelatedTable
      caption="Service cases, newest first"
      empty="No cases on record."
      rows={cases}
      columns={[
        { key: 'number', label: 'Case', render: (c) => <strong>{c.case_number}</strong> },
        { key: 'opened', label: 'Opened', render: (c) => formatDate(c.opened_on) },
        { key: 'severity', label: 'Severity', render: (c) => <StatusText value={c.severity} /> },
        { key: 'category', label: 'Category', render: (c) => humanise(c.category) },
        {
          key: 'subject',
          label: 'Subject',
          wide: true,
          render: (c) => (
            <span className="acct-stack acct-stack--left">
              {c.subject}
              <span className="acct-row__sub">
                {[
                  siteById.get(c.site_id)?.name,
                  c.competitor_alias && `${c.competitor_alias} mentioned`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </span>
          ),
        },
        {
          key: 'csat',
          label: 'Satisfaction',
          numeric: true,
          render: (c) => (c.csat ? `${c.csat} of 5` : EMPTY),
        },
        {
          key: 'state',
          label: 'State',
          render: (c) =>
            c.closed_on ? `Closed ${formatDate(c.closed_on)}` : <StatusText value="open" />,
        },
      ]}
    />
  );
}

function ActivitiesList({ activities, contacts }) {
  const contactById = new Map(contacts.map((c) => [c.id, c]));
  return (
    <RelatedTable
      caption="Meetings, calls and emails, newest first"
      empty="No activities on record."
      rows={activities}
      columns={[
        { key: 'date', label: 'Date', render: (a) => formatDate(a.occurred_on) },
        {
          key: 'type',
          label: 'Type',
          render: (a) =>
            a.activity_type === 'qbr' ? 'Business review' : humanise(a.activity_type),
        },
        {
          key: 'contact',
          label: 'With',
          render: (a) => contactById.get(a.contact_id)?.full_name ?? EMPTY,
        },
        { key: 'subject', label: 'Subject', wide: true, render: (a) => a.subject },
        { key: 'outcome', label: 'Outcome', wide: true, render: (a) => a.outcome || EMPTY },
      ]}
    />
  );
}

function OpportunitiesList({ opportunities }) {
  return (
    <RelatedTable
      caption="Opportunities"
      empty="No opportunities on record. Creating one from the next best action arrives in Phase 3."
      rows={opportunities}
      columns={[
        { key: 'name', label: 'Opportunity', wide: true, render: (o) => <strong>{o.name}</strong> },
        { key: 'type', label: 'Type', render: (o) => humanise(o.opportunity_type) },
        { key: 'stage', label: 'Stage', render: (o) => <StatusText value={o.stage} /> },
        { key: 'amount', label: 'Amount', numeric: true, render: (o) => formatSgd(o.amount_sgd) },
        {
          key: 'products',
          label: 'Products',
          render: (o) => o.product_codes.map(productName).join(', '),
        },
        { key: 'created', label: 'Created', render: (o) => formatDate(o.created_on) },
        { key: 'closed', label: 'Closed', render: (o) => formatDate(o.closed_on) },
      ]}
    />
  );
}

function StakeholdersList({ contacts }) {
  return (
    <RelatedTable
      caption="Stakeholders and their roles"
      empty="No contacts on record."
      rows={contacts}
      columns={[
        { key: 'name', label: 'Name', render: (c) => <strong>{c.full_name}</strong> },
        { key: 'title', label: 'Title', render: (c) => c.title },
        { key: 'role', label: 'Role', render: (c) => roleLabel(c.role) },
        { key: 'email', label: 'Email (masked)', render: (c) => c.email_masked },
        { key: 'last', label: 'Last contacted', render: (c) => formatDate(c.last_contacted_on) },
        {
          key: 'status',
          label: 'Status',
          render: (c) =>
            c.left_company ? (
              <span className="acct-status acct-status--danger">Left {formatDate(c.left_on)}</span>
            ) : (
              <span className="acct-status acct-status--success">Active</span>
            ),
        },
      ]}
    />
  );
}

const STATUS_TONE = {
  active: 'success',
  won: 'success',
  renewed: 'success',
  open: 'warning',
  pending: 'warning',
  downgraded: 'warning',
  expiring: 'warning',
  medium: 'warning',
  proposal: 'warning',
  meeting: 'warning',
  identified: 'neutral',
  low: 'neutral',
  cancelled: 'danger',
  expired: 'danger',
  lost: 'danger',
  high: 'danger',
  critical: 'danger',
};

function StatusText({ value }) {
  return (
    <span className={`acct-status acct-status--${STATUS_TONE[value] ?? 'neutral'}`}>
      {humanise(value)}
    </span>
  );
}

// ---------- Loading ----------

function AccountSkeleton() {
  return (
    <div className="acct-page st-page" aria-busy="true" aria-label="Loading account">
      <BackLink />
      <div className="acct-highlights">
        <span className="acct-skeleton acct-skeleton--title" />
        <div className="acct-facts">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="acct-fact">
              <span className="acct-skeleton acct-skeleton--line" />
              <span className="acct-skeleton acct-skeleton--line" />
            </div>
          ))}
        </div>
      </div>
      <span className="acct-skeleton acct-skeleton--path" />
      <div className="acct-overview">
        <div className="acct-overview__side">
          <div className="card acct-card acct-card--skeleton" />
        </div>
        <div className="acct-overview__main">
          <div className="card acct-card acct-card--skeleton" />
          <div className="card acct-card acct-card--skeleton" />
        </div>
      </div>
    </div>
  );
}
