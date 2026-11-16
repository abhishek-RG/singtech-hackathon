// SingTech AI workspace shell: one rounded app on the canvas with a sidebar and a top bar.
// Structure follows the shadcn-ui/ui sidebar blocks (MIT): collapsible nav groups and the user card
// from apps/v4/registry/new-york-v4/blocks/sidebar-07/components/nav-main.tsx and nav-user.tsx, the
// icon-rail collapse from apps/v4/registry/new-york-v4/ui/sidebar.tsx, and the top bar from
// blocks/dashboard-01/components/site-header.tsx. Rebuilt with plain React and module CSS.

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { getTheme, setTheme } from '../../../lib/theme.js';
import { getAccountBook } from '../api.js';
import Icon, { Logo, LogoMark } from '../components/Icon.jsx';
import HealthBadge from '../components/HealthBadge.jsx';
import useActiveIndicator from '../components/useActiveIndicator.js';
import { reasonLabel } from '../format.js';
import { usePreference } from '../storage.js';
import { RequireSession, initials, roleLabel, useSession } from './session.jsx';
import '../theme.css';
import './shell.css';

const ShellContext = createContext({ setTitle: () => {} });

/** Sets the top bar title and the document title while a page is mounted. */
export function usePageTitle(title, documentTitle = title) {
  const { setTitle } = useContext(ShellContext);
  useEffect(() => {
    setTitle(title);
    const previous = document.title;
    document.title = `${documentTitle} | SingTech AI`;
    return () => {
      document.title = previous;
    };
  }, [title, documentTitle, setTitle]);
}

export default function WorkspaceShell() {
  return (
    <RequireSession fallback={<ShellSkeleton />}>
      <Shell />
    </RequireSession>
  );
}

function Shell() {
  const location = useLocation();
  const [title, setTitle] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [book, setBook] = useState(null);
  const contentRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    getAccountBook({ signal: controller.signal })
      .then((data) => setBook(data.rows))
      .catch(() => setBook([]));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
    contentRef.current?.scrollTo({ top: 0 });
  }, [location.pathname]);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setDrawerOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  const setTitleStable = useCallback((t) => setTitle(t), []);

  return (
    <ShellContext.Provider value={{ setTitle: setTitleStable }}>
      <div className="st-root st-app">
        <a href="#st-main" className="st-skip">
          Skip to content
        </a>
        <div className={`st-shell${drawerOpen ? ' is-drawer-open' : ''}`}>
          <Sidebar book={book} onNavigate={() => setDrawerOpen(false)} />
          {drawerOpen && (
            <button
              type="button"
              className="st-scrim"
              aria-label="Close menu"
              onClick={() => setDrawerOpen(false)}
            />
          )}
          <div className="st-main">
            <TopBar title={title} book={book} onMenu={() => setDrawerOpen(true)} />
            <main id="st-main" className="st-content" ref={contentRef} tabIndex={-1}>
              <div key={location.pathname} className="st-route">
                <Outlet />
              </div>
            </main>
          </div>
        </div>
      </div>
    </ShellContext.Provider>
  );
}

// ---------- Sidebar ----------

function Sidebar({ book, onNavigate }) {
  const location = useLocation();
  const view = new URLSearchParams(location.search).get('view');
  const [groups, setGroups] = usePreference('sidebar-groups', { accounts: true, insights: true });
  const navRef = useRef(null);
  const indicator = useActiveIndicator(navRef, '.st-nav__item.is-active', [
    location.pathname,
    location.search,
    groups.accounts,
    groups.insights,
  ]);
  const rows = book ?? [];
  const count = {
    all: rows.length,
    atRisk: rows.filter((r) => r.health.band === 'at_risk').length,
    renewals: rows.filter((r) => r.contract_runway && r.contract_runway.days <= 120).length,
  };

  return (
    <aside className="st-sidebar" aria-label="Workspace">
      <Link
        to="/accounts"
        className="st-sidebar__brand"
        onClick={onNavigate}
        aria-label="SingTech AI, account book"
      >
        <Logo size={30} />
      </Link>

      <UserCard />

      <nav
        className={`st-nav${indicator.box ? ' has-indicator' : ''}`}
        aria-label="Main"
        ref={navRef}
      >
        {indicator.box && (
          <span
            className={`st-nav__indicator${indicator.ready ? ' is-ready' : ''}`}
            aria-hidden="true"
            style={{
              width: indicator.box.w,
              height: indicator.box.h,
              transform: `translate(${indicator.box.x}px, ${indicator.box.y}px)`,
            }}
          />
        )}
        <NavGroup
          id="accounts"
          label="My accounts"
          open={groups.accounts}
          onToggle={() => setGroups((g) => ({ ...g, accounts: !g.accounts }))}
        >
          <NavItem
            to="/accounts"
            icon="table"
            label="Account book"
            active={
              location.pathname.startsWith('/accounts/') ||
              (location.pathname === '/accounts' && view !== 'at_risk' && view !== 'renewals')
            }
            count={book ? count.all : null}
            onClick={onNavigate}
          />
          <NavItem
            to="/accounts?view=at_risk"
            icon="alert"
            label="At risk"
            active={location.pathname === '/accounts' && view === 'at_risk'}
            count={book ? count.atRisk : null}
            onClick={onNavigate}
          />
          <NavItem
            to="/accounts?view=renewals"
            icon="calendar"
            label="Renewals"
            active={location.pathname === '/accounts' && view === 'renewals'}
            count={book ? count.renewals : null}
            onClick={onNavigate}
          />
        </NavGroup>
        <NavGroup
          id="insights"
          label="Insights"
          open={groups.insights}
          onToggle={() => setGroups((g) => ({ ...g, insights: !g.insights }))}
        >
          <NavItem
            to="/assistant"
            icon="sparkle"
            label="Ask SingTech AI"
            active={location.pathname.startsWith('/assistant')}
            badge="New"
            onClick={onNavigate}
          />
          <NavItem to="/" icon="globe" label="Product site" active={false} onClick={onNavigate} />
        </NavGroup>
      </nav>

      <div className="st-sidebar__bottom">
        <span
          className="st-nav__item st-nav__item--disabled"
          aria-disabled="true"
          title="Settings arrive in a later phase"
        >
          <Icon name="sliders" />
          <span className="st-nav__label">Settings</span>
          <span className="st-pill st-pill--neutral st-nav__trail">Soon</span>
        </span>
        <div className="st-promo">
          <span className="st-tile st-tile--accent" aria-hidden="true">
            <Icon name="sparkle" size={16} />
          </span>
          <p className="st-promo__title">Need an account overview?</p>
          <p className="st-promo__text">Ask SingTech AI for a sourced summary of any account.</p>
          <Link to="/assistant?intent=summary" className="st-promo__button" onClick={onNavigate}>
            Start a summary
          </Link>
        </div>
      </div>
    </aside>
  );
}

function NavGroup({ id, label, open, onToggle, children }) {
  return (
    <div className="st-nav__group">
      <button
        type="button"
        className="st-nav__heading"
        aria-expanded={open}
        aria-controls={`st-nav-${id}`}
        onClick={onToggle}
      >
        <Icon
          name="chevronDown"
          size={14}
          className={`st-nav__chevron${open ? '' : ' is-closed'}`}
        />
        <span>{label}</span>
      </button>
      <ul id={`st-nav-${id}`} className="st-nav__list" hidden={!open}>
        {children}
      </ul>
    </div>
  );
}

function NavItem({ to, icon, label, active, count, badge, onClick }) {
  return (
    <li>
      <Link
        to={to}
        className={`st-nav__item${active ? ' is-active' : ''}`}
        aria-current={active ? 'page' : undefined}
        onClick={onClick}
        title={label}
      >
        <Icon name={icon} />
        <span className="st-nav__label">{label}</span>
        {badge && <span className="st-pill st-pill--accent st-nav__trail">{badge}</span>}
        {count !== null && count !== undefined && (
          <span className="st-count st-nav__trail">{count}</span>
        )}
      </Link>
    </li>
  );
}

function UserCard() {
  const { user, signOut } = useSession();
  const [open, setOpen, ref] = usePopover();
  return (
    <div className="st-user" ref={ref}>
      <span className="st-avatar" aria-hidden="true">
        {initials(user.name)}
      </span>
      <span className="st-user__text">
        <span className="st-user__name">{user.name}</span>
        <span className="st-user__role">{user.title ?? roleLabel(user.role)}</span>
      </span>
      <button
        type="button"
        className="st-user__menu-btn"
        aria-label="Account menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Icon name="kebab" />
      </button>
      {open && (
        <div className="st-menu st-menu--user" role="menu">
          <p className="st-menu__meta">
            Signed in as {user.email}
            <span className="st-pill st-pill--neutral">{roleLabel(user.role)}</span>
          </p>
          <button type="button" role="menuitem" className="st-menu__item" onClick={signOut}>
            <Icon name="logOut" size={16} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

// ---------- Top bar ----------

function TopBar({ title, book, onMenu }) {
  const alerts = (book ?? []).filter((r) => r.health.band !== 'healthy');
  const [open, setOpen, ref] = usePopover();
  const navigate = useNavigate();

  return (
    <header className="st-topbar">
      <button
        type="button"
        className="st-icon-btn st-topbar__menu"
        aria-label="Open menu"
        onClick={onMenu}
      >
        <Icon name="menu" />
      </button>
      <LogoMark size={26} />
      <p className="st-topbar__title">{title}</p>
      <span
        className="st-pill st-pill--sim"
        title="Fictional companies and people. Not live CRM data."
      >
        <span className="st-pill__dot" aria-hidden="true" />
        Simulated data
      </span>
      <div className="st-topbar__actions">
        <Link
          to="/assistant"
          className="st-icon-btn"
          aria-label="Ask SingTech AI"
          title="Ask SingTech AI"
        >
          <Icon name="message" />
        </Link>
        <div className="st-popover-anchor" ref={ref}>
          <button
            type="button"
            className="st-icon-btn"
            aria-label={`Notifications, ${alerts.length} accounts need attention`}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <Icon name="bell" />
            {alerts.length > 0 && <span className="st-dot" aria-hidden="true" />}
          </button>
          {open && (
            <div
              className="st-menu st-menu--notifications"
              role="menu"
              aria-label="Needs attention"
            >
              <p className="st-menu__title">
                Needs attention
                <span className="st-count">{alerts.length}</span>
              </p>
              {alerts.length === 0 ? (
                <p className="st-menu__meta">Every account is healthy.</p>
              ) : (
                alerts.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    role="menuitem"
                    className="st-menu__item st-menu__item--alert"
                    onClick={() => {
                      setOpen(false);
                      navigate(`/accounts/${r.id}`);
                    }}
                  >
                    <span className="st-menu__text">
                      <span className="st-menu__name">{r.name}</span>
                      {r.health.top_reason && (
                        <span className="st-menu__sub">{reasonLabel(r.health.top_reason)}</span>
                      )}
                    </span>
                    <HealthBadge band={r.health.band} score={r.health.score} size="sm" />
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}

function ThemeToggle() {
  const [theme, setThemeState] = useState(getTheme);
  const choose = (next) => {
    setTheme(next);
    setThemeState(next);
  };
  return (
    <div className="st-theme" role="group" aria-label="Colour theme">
      <button
        type="button"
        className="st-theme__btn"
        aria-pressed={theme === 'light'}
        aria-label="Light theme"
        onClick={() => choose('light')}
      >
        <Icon name="sun" size={16} />
      </button>
      <button
        type="button"
        className="st-theme__btn"
        aria-pressed={theme === 'dark'}
        aria-label="Dark theme"
        onClick={() => choose('dark')}
      >
        <Icon name="moon" size={16} />
      </button>
    </div>
  );
}

/** Open state for a small popover that closes on outside click and Escape. */
function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      ref.current?.querySelector('button[aria-expanded]')?.focus();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return [open, setOpen, ref];
}

export function ShellSkeleton() {
  return (
    <div className="st-root st-app" aria-busy="true" aria-label="Loading SingTech AI">
      <div className="st-shell">
        <aside className="st-sidebar">
          <span className="st-sidebar__brand">
            <Logo size={30} />
          </span>
          <span className="st-skel st-skel--card" />
          <span className="st-skel st-skel--line" />
          <span className="st-skel st-skel--line" />
          <span className="st-skel st-skel--line" />
        </aside>
        <div className="st-main">
          <header className="st-topbar">
            <span className="st-skel st-skel--title" />
          </header>
          <div className="st-content" />
        </div>
      </div>
    </div>
  );
}
