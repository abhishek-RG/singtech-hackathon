// Evidence: every reason, change and gap on the Account page names the records it came from.
// <EvidenceLinks ids={[...]} /> renders one chip per record; clicking opens the record in a dialog
// loaded from the API, so a seller can check the source before acting on it.

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import Button from '../../../components/Button.jsx';
import { getEvidence } from '../api.js';
import { EMPTY, formatDate, formatSgd, humanise, productName, roleLabel } from '../format.js';

const EvidenceContext = createContext({ index: new Map(), open: () => {} });

export function EvidenceProvider({ index, onOpen, children }) {
  return (
    <EvidenceContext.Provider value={{ index, open: onOpen }}>{children}</EvidenceContext.Provider>
  );
}

export function EvidenceLinks({ ids = [], max = 4 }) {
  const { index, open } = useContext(EvidenceContext);
  const [expanded, setExpanded] = useState(false);
  const unique = [...new Set(ids)];
  if (!unique.length) return null;
  const shown = expanded ? unique : unique.slice(0, max);
  return (
    <span className="acct-evidence">
      {shown.map((id) => (
        <button key={id} type="button" className="acct-chip" onClick={() => open(id)}>
          {index.get(id)?.label ?? 'Source record'}
        </button>
      ))}
      {unique.length > max && !expanded && (
        <button
          type="button"
          className="acct-chip acct-chip--more"
          onClick={() => setExpanded(true)}
        >
          +{unique.length - max} more
        </button>
      )}
    </span>
  );
}

// Fields shown per table, in order. Anything not listed is left out (ids, internal codes).
const FIELDS = {
  cases: [
    'case_number',
    'opened_on',
    'closed_on',
    'severity',
    'category',
    'subject',
    'description',
    'competitor_alias',
    'csat',
  ],
  assets: [
    'product_name',
    'status',
    'start_date',
    'end_date',
    'quantity',
    'monthly_value_sgd',
    'change_type',
    'changed_on',
    'previous_monthly_value_sgd',
  ],
  contracts: [
    'contract_number',
    'start_date',
    'end_date',
    'term_months',
    'total_value_sgd',
    'status',
    'product_codes',
    'auto_renew',
  ],
  contacts: [
    'full_name',
    'title',
    'role',
    'email_masked',
    'left_company',
    'left_on',
    'last_contacted_on',
  ],
  bills: [
    'bill_number',
    'period_start',
    'period_end',
    'amount_sgd',
    'currency',
    'amount',
    'status',
    'product_lines',
  ],
  activities: ['occurred_on', 'activity_type', 'subject', 'outcome', 'notes'],
  sites: ['name', 'site_type', 'city', 'country', 'on_net', 'opened_on', 'closed_on'],
  opportunities: [
    'name',
    'opportunity_type',
    'stage',
    'amount_sgd',
    'product_codes',
    'created_on',
    'closed_on',
    'source',
  ],
};

const LABELS = {
  case_number: 'Case',
  opened_on: 'Opened',
  closed_on: 'Closed',
  competitor_alias: 'Competitor mentioned',
  csat: 'Satisfaction (1 to 5)',
  product_name: 'Product',
  start_date: 'Start',
  end_date: 'End',
  monthly_value_sgd: 'Monthly value',
  change_type: 'Change',
  changed_on: 'Changed on',
  previous_monthly_value_sgd: 'Previous monthly value',
  contract_number: 'Contract',
  term_months: 'Term (months)',
  total_value_sgd: 'Total value',
  product_codes: 'Products',
  auto_renew: 'Auto renew',
  full_name: 'Name',
  email_masked: 'Email (masked)',
  left_company: 'Left company',
  left_on: 'Left on',
  last_contacted_on: 'Last contacted',
  bill_number: 'Bill',
  period_start: 'Period start',
  period_end: 'Period end',
  amount_sgd: 'Amount',
  amount: 'Amount in local currency',
  product_lines: 'Lines',
  occurred_on: 'Date',
  activity_type: 'Type',
  site_type: 'Site type',
  on_net: 'On the Singtel network',
  opportunity_type: 'Type',
};

function formatField(key, value, row) {
  if (value === null || value === undefined || value === '') return EMPTY;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (key.endsWith('_sgd')) return formatSgd(value);
  if (key === 'amount') return `${row.currency} ${Number(value).toLocaleString('en-SG')}`;
  if (/(_on|_date|period_start|period_end)$/.test(key)) return formatDate(value);
  if (key === 'role') return roleLabel(value);
  if (key === 'product_codes') return value.map(productName).join(', ');
  if (key === 'product_lines')
    return value.map((l) => `${l.description}: ${formatSgd(l.amount_sgd)}`).join('; ');
  if (
    [
      'severity',
      'category',
      'status',
      'change_type',
      'activity_type',
      'site_type',
      'opportunity_type',
      'stage',
      'source',
    ].includes(key)
  ) {
    return humanise(value);
  }
  return String(value);
}

export function EvidenceDialog({ accountId, evidenceId, onClose }) {
  const { index } = useContext(EvidenceContext);
  const dialogRef = useRef(null);
  const [state, setState] = useState({ status: 'idle', record: null, error: null });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!evidenceId) {
      if (dialog?.open) dialog.close();
      return undefined;
    }
    if (!dialog.open) dialog.showModal();
    const controller = new AbortController();
    setState({ status: 'loading', record: null, error: null });
    getEvidence(accountId, evidenceId, { signal: controller.signal })
      .then((record) => setState({ status: 'ready', record, error: null }))
      .catch((error) => {
        if (error.name !== 'AbortError')
          setState({ status: 'error', record: null, error: error.message });
      });
    return () => controller.abort();
  }, [accountId, evidenceId]);

  const label = state.record?.label ?? index.get(evidenceId)?.label ?? 'Source record';
  const fields = state.record ? (FIELDS[state.record.table] ?? []) : [];

  return (
    <dialog
      ref={dialogRef}
      className="acct-dialog"
      aria-labelledby="acct-dialog-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) dialogRef.current.close();
      }}
    >
      <div className="acct-dialog__inner">
        <header className="acct-dialog__header">
          <div>
            <p className="acct-eyebrow">Source record</p>
            <h2 id="acct-dialog-title" className="acct-dialog__title">
              {label}
            </h2>
          </div>
          <Button variant="ghost" size="sm" onClick={() => dialogRef.current.close()}>
            Close
          </Button>
        </header>
        {state.status === 'loading' && (
          <div aria-hidden="true">
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i} className="acct-skeleton acct-skeleton--line" />
            ))}
          </div>
        )}
        {state.status === 'error' && <p role="alert">This record could not load: {state.error}.</p>}
        {state.status === 'ready' && (
          <dl className="acct-fields">
            {fields.map((key) => (
              <div key={key} className="acct-fields__row">
                <dt>{LABELS[key] ?? humanise(key)}</dt>
                <dd>{formatField(key, state.record.row[key], state.record.row)}</dd>
              </div>
            ))}
          </dl>
        )}
        <p className="acct-dialog__note">Simulated record from the CRM connector. Read only.</p>
      </div>
    </dialog>
  );
}
