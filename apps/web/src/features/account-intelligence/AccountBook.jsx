// Account book: every existing enterprise and MNC customer, sorted by revenue at stake.
// A list view in the Salesforce style with an Excel-style table: saved views, column filters,
// click-to-sort headers, CSV export and keyboard navigation. Filters and sort are remembered.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { INDUSTRIES, MARKETS, SEGMENTS } from '@singtech/shared';
import Button from '../../components/Button.jsx';
import { getAccountBook, getMeta } from './api.js';
import { summariseBook } from './bookSummary.js';
import { downloadCsv, toCsv } from './csv.js';
import {
  EMPTY,
  bandLabel,
  formatAmount,
  formatDate,
  formatRunway,
  formatSgd,
  formatTenure,
  marketName,
  productName,
  reasonLabel,
} from './format.js';
import { usePreference } from './storage.js';
import HealthBadge from './components/HealthBadge.jsx';
import Icon from './components/Icon.jsx';
import useCountUp from './components/useCountUp.js';
import { usePageTitle } from './shell/WorkspaceShell.jsx';
import { useToast } from './components/Toast.jsx';
import './AccountIntelligence.css';

const RENEWAL_WINDOW_DAYS = 120;

const VIEWS = [
  { id: 'all', label: 'All accounts', test: () => true },
  { id: 'at_risk', label: 'At risk', test: (r) => r.health.band === 'at_risk' },
  { id: 'watch', label: 'Watch', test: (r) => r.health.band === 'watch' },
  {
    id: 'renewals',
    label: `Renewals in ${RENEWAL_WINDOW_DAYS} days`,
    test: (r) => Boolean(r.contract_runway && r.contract_runway.days <= RENEWAL_WINDOW_DAYS),
  },
];

const COLUMNS = [
  { key: 'name', label: 'Account', sortValue: (r) => r.name.toLowerCase(), type: 'text' },
  { key: 'market', label: 'Market', sortValue: (r) => marketName(r.market), type: 'text' },
  {
    key: 'industry',
    label: 'Industry',
    sortValue: (r) => r.industry,
    type: 'text',
    hideMedium: true,
  },
  { key: 'health', label: 'Health', sortValue: (r) => r.health.score, type: 'number' },
  {
    key: 'products',
    label: 'Products',
    sortValue: (r) => r.products_owned,
    type: 'number',
    numeric: true,
  },
  {
    key: 'tenure',
    label: 'Tenure',
    sortValue: (r) => r.tenure?.total_months ?? -1,
    type: 'number',
    numeric: true,
    hideMedium: true,
  },
  {
    key: 'contract_end',
    label: 'Contract end',
    sortValue: (r) => r.contract_runway?.days ?? Number.MAX_SAFE_INTEGER,
    type: 'number',
  },
  {
    key: 'revenue_at_stake',
    label: 'At stake (SGD)',
    longLabel: 'Revenue at stake',
    sortValue: (r) => r.revenue_at_stake_sgd,
    type: 'number',
    numeric: true,
  },
  { key: 'next_action', label: 'Next action', sortValue: (r) => r.next_action.label, type: 'text' },
];

const DEFAULT_PREFS = {
  sort: { key: 'revenue_at_stake', dir: 'desc' },
  filters: { q: '', market: '', industry: '', segment: '' },
};

export default function AccountBook() {
  const navigate = useNavigate();
  const [state, setState] = useState({ status: 'loading', rows: [], meta: null, error: null });
  const [prefs, setPrefs] = usePreference('account-book', DEFAULT_PREFS);
  const [toastElement, showToast] = useToast();
  const rowRefs = useRef([]);
  // Rows fade in once, right after the first load; later sorting and filtering do not animate.
  const [entering, setEntering] = useState(true);
  const [params, setParams] = useSearchParams();
  const view = VIEWS.some((v) => v.id === params.get('view')) ? params.get('view') : 'all';
  const setView = (id) => setParams(id === 'all' ? {} : { view: id }, { replace: true });
  usePageTitle('Account book');

  const load = useCallback(async (signal) => {
    setState((s) => ({ ...s, status: 'loading', error: null }));
    try {
      const [meta, book] = await Promise.all([getMeta({ signal }), getAccountBook({ signal })]);
      setState({ status: 'ready', rows: book.rows, meta, error: null });
    } catch (error) {
      if (error.name === 'AbortError') return;
      setState({ status: 'error', rows: [], meta: null, error: error.message });
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    if (state.status !== 'ready' || !entering) return undefined;
    const timer = setTimeout(() => setEntering(false), 450);
    return () => clearTimeout(timer);
  }, [state.status, entering]);

  const { sort, filters } = prefs;
  const [filtersOpen, setFiltersOpen] = useState(() =>
    Object.entries(prefs.filters).some(([key, value]) => key !== 'q' && value),
  );
  const setFilter = (key, value) =>
    setPrefs((p) => ({ ...p, filters: { ...p.filters, [key]: value } }));
  const clearFilters = () => setPrefs((p) => ({ ...p, filters: DEFAULT_PREFS.filters }));
  const filtersActive = Object.values(filters).some(Boolean);
  const activeFilterCount = ['market', 'industry', 'segment'].filter((key) => filters[key]).length;

  // Rows that pass the column filters, before the saved view is applied (for the view counts).
  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return state.rows.filter(
      (r) =>
        (!q ||
          r.name.toLowerCase().includes(q) ||
          (r.parent_name ?? '').toLowerCase().includes(q)) &&
        (!filters.market || r.market === filters.market) &&
        (!filters.industry || r.industry === filters.industry) &&
        (!filters.segment || r.segment === filters.segment),
    );
  }, [state.rows, filters]);

  const activeView = VIEWS.find((v) => v.id === view) ?? VIEWS[0];
  const visible = useMemo(() => {
    const column = COLUMNS.find((c) => c.key === sort.key) ?? COLUMNS[7];
    const direction = sort.dir === 'asc' ? 1 : -1;
    return filtered.filter(activeView.test).sort((a, b) => {
      const x = column.sortValue(a);
      const y = column.sortValue(b);
      const order = column.type === 'text' ? String(x).localeCompare(String(y)) : x - y;
      return (
        order * direction ||
        b.revenue_at_stake_sgd - a.revenue_at_stake_sgd ||
        a.name.localeCompare(b.name)
      );
    });
  }, [filtered, activeView, sort]);

  const summary = useMemo(() => summariseBook(visible), [visible]);

  const options = useMemo(
    () => ({
      markets: MARKETS.filter((m) => state.rows.some((r) => r.market === m.code)),
      industries: INDUSTRIES.filter((i) => state.rows.some((r) => r.industry === i)),
    }),
    [state.rows],
  );

  const toggleSort = (column) =>
    setPrefs((p) => ({
      ...p,
      sort:
        p.sort.key === column.key
          ? { key: column.key, dir: p.sort.dir === 'asc' ? 'desc' : 'asc' }
          : { key: column.key, dir: column.type === 'text' ? 'asc' : 'desc' },
    }));

  const openAccount = (row) => navigate(`/accounts/${row.id}`);

  const onRowKeyDown = (event, index, row) => {
    const focusRow = (i) => rowRefs.current[Math.max(0, Math.min(visible.length - 1, i))]?.focus();
    if (event.key === 'ArrowDown') focusRow(index + 1);
    else if (event.key === 'ArrowUp') focusRow(index - 1);
    else if (event.key === 'Home') focusRow(0);
    else if (event.key === 'End') focusRow(visible.length - 1);
    else if (event.key === 'Enter' && event.target === event.currentTarget) openAccount(row);
    else return;
    event.preventDefault();
  };

  const exportCsv = () => {
    const csv = toCsv(visible, [
      { header: 'Account', value: (r) => r.name },
      { header: 'Group', value: (r) => r.parent_name ?? '' },
      { header: 'Owner', value: (r) => r.owner_name },
      { header: 'Market', value: (r) => marketName(r.market) },
      { header: 'Industry', value: (r) => r.industry },
      {
        header: 'Segment',
        value: (r) => SEGMENTS.find((s) => s.code === r.segment)?.label ?? r.segment,
      },
      { header: 'Health score', value: (r) => r.health.score },
      { header: 'Health band', value: (r) => bandLabel(r.health.band) },
      { header: 'Top reason', value: (r) => reasonLabel(r.health.top_reason) ?? '' },
      { header: 'Products owned (of 6)', value: (r) => r.products_owned },
      { header: 'Customer since', value: (r) => r.tenure?.since ?? '' },
      { header: 'Contract end', value: (r) => r.contract_runway?.end_date ?? '' },
      { header: 'Days to contract end', value: (r) => r.contract_runway?.days ?? '' },
      { header: 'Annual recurring revenue (SGD)', value: (r) => Math.round(r.arr_sgd) },
      { header: 'Revenue at stake (SGD)', value: (r) => r.revenue_at_stake_sgd },
      { header: 'Next action', value: (r) => r.next_action.label },
      { header: 'Product', value: (r) => productName(r.next_action.product_code) ?? '' },
    ]);
    const today = state.meta?.today ?? new Date().toISOString().slice(0, 10);
    const suffix = state.meta?.simulated === false ? '' : '-simulated';
    downloadCsv(`singtech-ai-account-book-${today}${suffix}.csv`, csv);
    showToast(`Exported ${visible.length} account${visible.length === 1 ? '' : 's'} to CSV`);
  };

  const loading = state.status === 'loading';
  const sortColumn = COLUMNS.find((c) => c.key === sort.key);
  const sortLabel = sortColumn?.longLabel ?? sortColumn?.label ?? '';

  return (
    <div className="acct-page st-page">
      <header className="st-page__intro">
        <h1 className="st-visually-hidden">Account book</h1>
        <p className="st-page__lead">
          Existing enterprise and MNC customers, sorted by revenue at stake. Open an account for its
          services, what changed, health and the next best action.
        </p>
      </header>

      <section className="acct-tiles" aria-label="Summary of this view">
        <Tile
          label="Accounts"
          icon="table"
          tint="blue"
          value={loading ? null : summary.count}
          format={(v) => Math.round(v)}
        />
        <Tile
          label="At risk"
          icon="alert"
          tint="orange"
          value={loading ? null : summary.atRisk}
          format={(v) => Math.round(v)}
          tone={summary.atRisk ? 'danger' : undefined}
        />
        <Tile
          label="Revenue at stake"
          icon="target"
          tint="purple"
          value={loading ? null : summary.stake}
          format={formatSgd}
        />
        <Tile
          label="Products owned"
          icon="layers"
          tint="green"
          value={loading ? null : summary.products}
          format={(v) => `${v.toFixed(1)} of 6`}
          hint="average"
        />
      </section>

      <section className="st-panel" aria-label="Accounts">
        <div className="st-panel__head">
          <div className="acct-views" role="group" aria-label="Saved views">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                className="acct-view"
                aria-pressed={v.id === activeView.id}
                onClick={() => setView(v.id)}
              >
                {v.label}
                <span className="acct-view__count">
                  {loading ? EMPTY : filtered.filter(v.test).length}
                </span>
              </button>
            ))}
          </div>
          <div className="st-panel__tools">
            <label className="st-search">
              <Icon name="search" size={16} />
              <span className="st-visually-hidden">Search accounts</span>
              <input
                type="search"
                className="st-search__input"
                placeholder="Search accounts"
                value={filters.q}
                onChange={(e) => setFilter('q', e.target.value)}
              />
            </label>
            <button
              type="button"
              className="st-tool-btn"
              aria-expanded={filtersOpen}
              aria-controls="acct-filters"
              onClick={() => setFiltersOpen((open) => !open)}
            >
              <Icon name="filter" size={16} />
              Filters
              {activeFilterCount > 0 && <span className="st-count">{activeFilterCount}</span>}
            </button>
            <button
              type="button"
              className="st-tool-btn"
              onClick={exportCsv}
              disabled={loading || !visible.length}
            >
              <Icon name="download" size={16} />
              Export
            </button>
          </div>
        </div>

        <div id="acct-filters" className="acct-toolbar" role="search" hidden={!filtersOpen}>
          <FilterSelect
            label="Market"
            value={filters.market}
            onChange={(v) => setFilter('market', v)}
          >
            {options.markets.map((m) => (
              <option key={m.code} value={m.code}>
                {m.name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            label="Industry"
            value={filters.industry}
            onChange={(v) => setFilter('industry', v)}
          >
            {options.industries.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            label="Segment"
            value={filters.segment}
            onChange={(v) => setFilter('segment', v)}
          >
            {SEGMENTS.map((s) => (
              <option key={s.code} value={s.code}>
                {s.label}
              </option>
            ))}
          </FilterSelect>
          <label className="acct-field acct-field--sort">
            <span className="acct-field__label">Sort by</span>
            <select
              className="acct-input"
              value={`${sort.key}:${sort.dir}`}
              onChange={(e) => {
                const [key, dir] = e.target.value.split(':');
                setPrefs((p) => ({ ...p, sort: { key, dir } }));
              }}
            >
              {COLUMNS.flatMap((c) => [
                <option key={`${c.key}:desc`} value={`${c.key}:desc`}>
                  {c.longLabel ?? c.label}, {c.type === 'text' ? 'Z to A' : 'high to low'}
                </option>,
                <option key={`${c.key}:asc`} value={`${c.key}:asc`}>
                  {c.longLabel ?? c.label}, {c.type === 'text' ? 'A to Z' : 'low to high'}
                </option>,
              ])}
            </select>
          </label>
          {filtersActive && (
            <div className="acct-toolbar__actions">
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            </div>
          )}
        </div>

        {state.status === 'error' ? (
          <div className="card acct-message" role="alert">
            <h2 className="acct-message__title">The account book could not load</h2>
            <p className="text-muted">
              {state.error}. Check that the API is running, then try again.
            </p>
            <Button variant="secondary" size="sm" onClick={() => load()}>
              Try again
            </Button>
          </div>
        ) : (
          <div className="acct-table-wrap">
            <table className="acct-table" aria-busy={loading}>
              <caption className="acct-visually-hidden">
                {activeView.label}, sorted by {sortLabel.toLowerCase()}. Use the arrow keys to move
                between rows and Enter to open an account.
              </caption>
              <thead>
                <tr>
                  {COLUMNS.map((c) => {
                    const active = sort.key === c.key;
                    return (
                      <th
                        key={c.key}
                        scope="col"
                        className={cellClass(c, sort.key)}
                        aria-sort={
                          active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'
                        }
                      >
                        <button
                          type="button"
                          className="acct-sort"
                          onClick={() => toggleSort(c)}
                          title={c.longLabel}
                        >
                          <span className="acct-sort__label">{c.label}</span>
                          <SortIcon dir={active ? sort.dir : null} />
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {loading &&
                  Array.from({ length: 6 }, (_, i) => (
                    <tr
                      key={`skeleton-${i}`}
                      className="acct-row acct-row--skeleton"
                      aria-hidden="true"
                    >
                      {COLUMNS.map((c) => (
                        <td key={c.key} className={cellClass(c, sort.key)} data-label={c.label}>
                          <span className={`acct-skeleton acct-skeleton--${c.key}`} />
                        </td>
                      ))}
                    </tr>
                  ))}

                {!loading && visible.length === 0 && (
                  <tr>
                    <td colSpan={COLUMNS.length} className="acct-empty">
                      <p className="acct-empty__title">No accounts in this view</p>
                      <p className="text-muted">
                        {filtersActive
                          ? 'No account matches these filters. Clear them to see the full book.'
                          : `${activeView.label} has no accounts today.`}
                      </p>
                      {filtersActive && (
                        <Button variant="secondary" size="sm" onClick={clearFilters}>
                          Clear filters
                        </Button>
                      )}
                    </td>
                  </tr>
                )}

                {!loading &&
                  visible.map((r, index) => (
                    <tr
                      key={r.id}
                      ref={(el) => {
                        rowRefs.current[index] = el;
                      }}
                      className={`acct-row${entering ? ' acct-row--enter' : ''}`}
                      style={entering ? { '--i': Math.min(index, 5) } : undefined}
                      tabIndex={0}
                      onClick={(e) => {
                        if (!window.getSelection()?.toString() && !e.target.closest('a'))
                          openAccount(r);
                      }}
                      onKeyDown={(e) => onRowKeyDown(e, index, r)}
                    >
                      <td className={cellClass(COLUMNS[0], sort.key)} data-label="Account">
                        <Link
                          to={`/accounts/${r.id}`}
                          className="acct-row__name acct-truncate"
                          tabIndex={-1}
                          title={r.name}
                        >
                          {r.name}
                        </Link>
                        <SubLine
                          text={[r.parent_name && `Part of ${r.parent_name}`, r.owner_name]
                            .filter(Boolean)
                            .join(' · ')}
                        />
                      </td>
                      <td className={cellClass(COLUMNS[1], sort.key)} data-label="Market">
                        {marketName(r.market)}
                      </td>
                      <td className={cellClass(COLUMNS[2], sort.key)} data-label="Industry">
                        {r.industry}
                      </td>
                      <td className={cellClass(COLUMNS[3], sort.key)} data-label="Health">
                        <span className="acct-stack">
                          <HealthBadge band={r.health.band} score={r.health.score} size="sm" />
                          {r.health.top_reason && (
                            <SubLine text={reasonLabel(r.health.top_reason)} />
                          )}
                        </span>
                      </td>
                      <td className={cellClass(COLUMNS[4], sort.key)} data-label="Products">
                        {r.products_owned} of {r.products_total}
                      </td>
                      <td className={cellClass(COLUMNS[5], sort.key)} data-label="Tenure">
                        {formatTenure(r.tenure)}
                      </td>
                      <td className={cellClass(COLUMNS[6], sort.key)} data-label="Contract end">
                        <span className="acct-stack">
                          {formatDate(r.contract_runway?.end_date)}
                          {r.contract_runway && (
                            <span
                              className={`acct-row__sub${r.contract_runway.days <= RENEWAL_WINDOW_DAYS ? ' acct-row__sub--warning' : ''}`}
                            >
                              {formatRunway(r.contract_runway.days)}
                            </span>
                          )}
                        </span>
                      </td>
                      <td className={cellClass(COLUMNS[7], sort.key)} data-label="At stake (SGD)">
                        {formatAmount(r.revenue_at_stake_sgd)}
                      </td>
                      <td className={cellClass(COLUMNS[8], sort.key)} data-label="Next action">
                        <span className="acct-stack acct-stack--fill">
                          <span
                            className="acct-row__action acct-truncate"
                            title={r.next_action.label}
                          >
                            {r.next_action.label}
                          </span>
                          {r.next_action.product_code && (
                            <SubLine text={productName(r.next_action.product_code)} />
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {toastElement}
    </div>
  );
}

function Tile({ label, value, format = (v) => v, hint, tone, icon, tint }) {
  const shown = useCountUp(value);
  return (
    <div className="acct-tile">
      {icon && (
        <span className={`st-tile st-tile--${tint}`} aria-hidden="true">
          <Icon name={icon} size={16} />
        </span>
      )}
      <p className="acct-tile__label">
        {label}
        {hint && <span className="acct-tile__hint"> ({hint})</span>}
      </p>
      {value === null ? (
        <span className="acct-skeleton acct-skeleton--tile" aria-hidden="true" />
      ) : (
        <p className={`acct-tile__value${tone ? ` acct-tile__value--${tone}` : ''}`}>
          {format(shown)}
        </p>
      )}
    </div>
  );
}

function FilterSelect({ label, value, onChange, children }) {
  return (
    <label className="acct-field">
      <span className="acct-field__label">{label}</span>
      <select className="acct-input" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">All</option>
        {children}
      </select>
    </label>
  );
}

/** One muted line under a cell's main value; cut with an ellipsis, full text on hover. */
function SubLine({ text }) {
  if (!text) return null;
  return (
    <span className="acct-row__sub acct-truncate" title={text}>
      {text}
    </span>
  );
}

/** The one sort icon: both chevrons when unsorted, the active direction highlighted. */
function SortIcon({ dir }) {
  return (
    <svg
      className="acct-sort__icon"
      data-dir={dir ?? 'none'}
      width="10"
      height="14"
      viewBox="0 0 10 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path className="acct-sort__up" d="M2 5.5 5 2.5l3 3" />
      <path className="acct-sort__down" d="M2 8.5l3 3 3-3" />
    </svg>
  );
}

function cellClass(column, sortKey) {
  return [
    `acct-col-${column.key}`,
    column.numeric && 'acct-num',
    column.hideMedium && 'acct-hide-medium',
    column.key === sortKey && 'is-sorted',
  ]
    .filter(Boolean)
    .join(' ');
}
