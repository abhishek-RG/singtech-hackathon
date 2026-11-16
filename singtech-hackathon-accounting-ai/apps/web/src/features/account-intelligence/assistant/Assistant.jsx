// Ask SingTech AI: the account assistant page (rules-based preview until the Phase 2 agent).
//
// Layout and behaviour follow these references, rebuilt with our CSS and no dependencies:
// - vercel/chatbot: components/chat/sidebar-history.tsx (history column), greeting.tsx and
//   suggested-actions.tsx (empty state), multimodal-input.tsx (composer), message-actions.tsx
//   (feedback and copy). Structure only; no code copied.
// - assistant-ui/assistant-ui (MIT): apps/docs/components/demo/elements/aui/thread.tsx (message
//   layout), composer.tsx (Enter to send, Shift+Enter for a new line), message-actions.tsx.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { askAssistant, getAccountBook } from '../api.js';
import { EvidenceDialog, EvidenceProvider, EvidenceLinks } from '../components/Evidence.jsx';
import HealthBadge from '../components/HealthBadge.jsx';
import Icon from '../components/Icon.jsx';
import { useToast } from '../components/Toast.jsx';
import { readPreference, usePreference, writePreference } from '../storage.js';
import { initials, useSession } from '../shell/session.jsx';
import { usePageTitle } from '../shell/WorkspaceShell.jsx';
import '../AccountIntelligence.css';
import './assistant.css';

const SUGGESTIONS = [
  {
    intent: 'summary',
    title: 'Account summary',
    text: 'Services, tenure, health and what changed.',
    icon: 'file',
    tint: 'blue',
  },
  {
    intent: 'why_at_risk',
    title: 'Why at risk?',
    text: 'The signals behind the health score.',
    icon: 'alert',
    tint: 'orange',
  },
  {
    intent: 'renewal_plan',
    title: 'Renewal plan',
    text: 'Steps before the contract ends.',
    icon: 'calendar',
    tint: 'green',
  },
  {
    intent: 'missing',
    title: 'What are they missing?',
    text: 'Products they lack that fit a signal.',
    icon: 'layers',
    tint: 'purple',
  },
];
const INTENT_LABEL = {
  summary: 'Give me an account summary',
  why_at_risk: 'Why is this account at risk?',
  renewal_plan: 'Draft a renewal plan',
  missing: 'What are they missing?',
  next_action: 'Show the talking points',
};
const BAND_TINT = { at_risk: 'orange', watch: 'purple', healthy: 'green' };
const RECENTS_KEY = 'assistant-recents';

let nextId = 1;
const newId = () => `m${Date.now()}-${nextId++}`;

export default function Assistant() {
  usePageTitle('Ask SingTech AI');
  const { user } = useSession();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [accounts, setAccounts] = useState(null);
  const [accountId, setAccountId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatId, setChatId] = useState(newId);
  const [recents, setRecents] = useState(() => readPreference(RECENTS_KEY, []));
  // The history column is remembered on wide screens; under 1024px it starts closed and overlays.
  const [historyPref, setHistoryPref] = usePreference('assistant-history-open', true);
  const [historyOpen, setHistoryOpenState] = useState(
    () => historyPref && window.matchMedia('(min-width: 1024px)').matches,
  );
  const setHistoryOpen = (open) => {
    setHistoryOpenState(open);
    if (window.matchMedia('(min-width: 1024px)').matches) setHistoryPref(open);
  };
  const [evidence, setEvidence] = useState(null);
  const [toastElement, showToast] = useToast();
  const endRef = useRef(null);
  const busy = messages.some((m) => m.pending);

  useEffect(() => {
    const controller = new AbortController();
    getAccountBook({ signal: controller.signal })
      .then((data) => setAccounts(data.rows))
      .catch(() => setAccounts([]));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [messages]);

  const account = accounts?.find((a) => a.id === accountId) ?? null;

  const saveRecent = useCallback((id, title, list) => {
    setRecents((current) => {
      const entry = { id, title, at: Date.now(), messages: list.filter((m) => !m.pending) };
      const next = [entry, ...current.filter((r) => r.id !== id)].slice(0, 12);
      writePreference(RECENTS_KEY, next);
      return next;
    });
  }, []);

  const send = useCallback(
    async ({ intent, message, forAccountId }) => {
      if (busy) return;
      const contextId = forAccountId === undefined ? accountId : forAccountId;
      const userText = message ?? INTENT_LABEL[intent];
      const pendingId = newId();
      const base = [...messages, { id: newId(), role: 'user', text: userText }];
      setMessages([...base, { id: pendingId, role: 'assistant', pending: true }]);
      try {
        const answer = await askAssistant({ accountId: contextId, intent, message });
        if (answer.account && !contextId) setAccountId(answer.account.id);
        const done = [...base, { id: pendingId, role: 'assistant', answer, intent }];
        setMessages(done);
        const title = answer.account ? `${answer.account.name}: ${userText}` : userText;
        saveRecent(
          chatId,
          base.length === 1 ? title : (recents.find((r) => r.id === chatId)?.title ?? title),
          done,
        );
      } catch (error) {
        setMessages([...base, { id: pendingId, role: 'assistant', error: error.message }]);
      }
    },
    [accountId, busy, chatId, messages, recents, saveRecent],
  );

  // Deep link from the sidebar promo: /assistant?intent=summary
  useEffect(() => {
    const intent = params.get('intent');
    if (intent && INTENT_LABEL[intent]) {
      setParams({}, { replace: true });
      send({ intent });
    }
    // Runs once for the incoming link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const newChat = (withAccountId = null) => {
    setMessages([]);
    setChatId(newId());
    setAccountId(withAccountId);
  };

  const openRecent = (recent) => {
    setChatId(recent.id);
    setMessages(recent.messages);
    const last = [...recent.messages].reverse().find((m) => m.answer?.account);
    setAccountId(last?.answer.account.id ?? null);
  };

  const evidenceIndex = useMemo(() => {
    const index = new Map();
    for (const m of messages)
      for (const c of m.answer?.citations ?? [])
        index.set(c.id, { label: c.label, accountId: m.answer.account?.id });
    return index;
  }, [messages]);

  const copyAnswer = async (answer) => {
    const text = answer.blocks
      .map((b) =>
        b.type === 'list'
          ? b.items.map((i, n) => `${b.ordered ? `${n + 1}.` : '-'} ${i.text}`).join('\n')
          : b.text,
      )
      .join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      showToast('Answer copied');
    } catch {
      showToast('Copy is blocked in this browser');
    }
  };

  return (
    <EvidenceProvider index={evidenceIndex} onOpen={(id) => setEvidence(id)}>
      <div className={`st-chat${historyOpen ? ' has-history' : ''}`}>
        {historyOpen && (
          <HistoryColumn
            accounts={accounts}
            recents={recents}
            activeChat={chatId}
            onNewChat={() => newChat(null)}
            onPickAccount={(id) => {
              newChat(id);
              if (!window.matchMedia('(min-width: 1024px)').matches) setHistoryOpenState(false);
            }}
            onOpenRecent={(recent) => {
              openRecent(recent);
              if (!window.matchMedia('(min-width: 1024px)').matches) setHistoryOpenState(false);
            }}
            onClose={() => setHistoryOpen(false)}
          />
        )}

        <section className="st-chat__main" aria-label="Conversation">
          <div className="st-chat__bar">
            <button
              type="button"
              className="st-icon-btn"
              aria-label={historyOpen ? 'Hide chat history' : 'Show chat history'}
              aria-expanded={historyOpen}
              onClick={() => setHistoryOpen(!historyOpen)}
            >
              <Icon name="panel" size={16} />
            </button>
            <AccountSelector accounts={accounts} account={account} onChange={setAccountId} />
            <button
              type="button"
              className="st-icon-btn"
              aria-label="New chat"
              onClick={() => newChat(null)}
            >
              <Icon name="plus" size={16} />
            </button>
          </div>

          <div className="st-chat__scroll">
            {messages.length === 0 ? (
              <EmptyState account={account} onPick={(intent) => send({ intent })}>
                <Composer
                  busy={busy}
                  account={account}
                  accounts={accounts}
                  onSend={send}
                  onPickAccount={setAccountId}
                  autoFocus
                />
              </EmptyState>
            ) : (
              <ol className="st-thread" aria-live="polite">
                {messages.map((m) =>
                  m.role === 'user' ? (
                    <li key={m.id} className="st-msg st-msg--user">
                      <p className="st-bubble">{m.text}</p>
                      <span className="st-avatar st-avatar--sm" aria-hidden="true">
                        {initials(user.name)}
                      </span>
                    </li>
                  ) : (
                    <AssistantMessage
                      key={m.id}
                      message={m}
                      onPickAccount={(id) => {
                        setAccountId(id);
                        send({ intent: m.answer.intent ?? 'summary', forAccountId: id });
                      }}
                      onIntent={(intent) => send({ intent })}
                      onOpenLink={(href) => navigate(href)}
                      onCopy={() => copyAnswer(m.answer)}
                      onFeedback={(value) =>
                        showToast(
                          value === 'up'
                            ? 'Thanks. Marked as helpful.'
                            : 'Thanks. Marked as not helpful.',
                        )
                      }
                    />
                  ),
                )}
                <li ref={endRef} aria-hidden="true" />
              </ol>
            )}
          </div>

          {messages.length > 0 && (
            <div className="st-chat__composer">
              <Composer
                busy={busy}
                account={account}
                accounts={accounts}
                onSend={send}
                onPickAccount={setAccountId}
              />
            </div>
          )}
        </section>
      </div>
      {evidence && evidenceIndex.get(evidence)?.accountId && (
        <EvidenceDialog
          accountId={evidenceIndex.get(evidence).accountId}
          evidenceId={evidence}
          onClose={() => setEvidence(null)}
        />
      )}
      {toastElement}
    </EvidenceProvider>
  );
}

// ---------- History column ----------

function HistoryColumn({
  accounts,
  recents,
  activeChat,
  onNewChat,
  onPickAccount,
  onOpenRecent,
  onClose,
}) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const shown = (accounts ?? [])
    .filter((a) => a.name.toLowerCase().includes(query.trim().toLowerCase()))
    .slice(0, query ? 10 : 5);
  return (
    <aside className="st-history" aria-label="Chat history">
      <button type="button" className="st-newchat" onClick={onNewChat}>
        <span className="st-newchat__icon" aria-hidden="true">
          <Icon name="plus" size={14} strokeWidth={2.2} />
        </span>
        New chat
      </button>

      <div className="st-history__card">
        <button
          type="button"
          className="st-history__item"
          aria-expanded={searching}
          onClick={() => setSearching((s) => !s)}
        >
          <Icon name="search" size={16} />
          Search accounts
        </button>
        {searching && (
          <input
            className="st-history__search"
            type="search"
            placeholder="Account name"
            aria-label="Search accounts"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        )}
        <Link to="/accounts" className="st-history__item">
          <Icon name="table" size={16} />
          Saved views
        </Link>
      </div>

      <div className="st-history__card">
        <p className="st-history__label">Accounts</p>
        {accounts === null && <span className="st-skel st-skel--line" />}
        {shown.map((a) => (
          <button
            key={a.id}
            type="button"
            className="st-history__item"
            onClick={() => onPickAccount(a.id)}
          >
            <span
              className={`st-tile st-tile--${BAND_TINT[a.health.band]} st-tile--xs`}
              aria-hidden="true"
            >
              <Icon name="table" size={12} />
            </span>
            <span className="st-history__text">{a.name}</span>
          </button>
        ))}
        {accounts && shown.length === 0 && <p className="st-history__empty">No account matches.</p>}
      </div>

      <div className="st-history__card st-history__card--recents">
        <p className="st-history__label">Recents</p>
        {recents.length === 0 ? (
          <p className="st-history__empty">Your questions will appear here.</p>
        ) : (
          <ul className="st-history__recents">
            {recents.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  className={`st-history__recent${r.id === activeChat ? ' is-active' : ''}`}
                  onClick={() => onOpenRecent(r)}
                  title={r.title}
                >
                  {r.title}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button type="button" className="st-history__close" onClick={onClose}>
        Hide history
      </button>
    </aside>
  );
}

// ---------- Account selector (the "model selector" pill) ----------

function AccountSelector({ accounts, account, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <div className="st-selector" ref={ref}>
      <button
        type="button"
        className="st-selector__btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="st-tile st-tile--accent st-tile--xs" aria-hidden="true">
          <Icon name="sparkle" size={12} />
        </span>
        <span className="st-selector__label">{account ? account.name : 'All my accounts'}</span>
        <Icon name="chevronDown" size={14} />
      </button>
      {open && (
        <ul className="st-menu st-selector__menu" role="listbox" aria-label="Account context">
          <li>
            <button
              type="button"
              role="option"
              aria-selected={!account}
              className="st-menu__item"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              All my accounts
              <span className="st-selector__hint">name one in your question</span>
            </button>
          </li>
          {(accounts ?? []).map((a) => (
            <li key={a.id}>
              <button
                type="button"
                role="option"
                aria-selected={account?.id === a.id}
                className="st-menu__item st-menu__item--stack"
                onClick={() => {
                  onChange(a.id);
                  setOpen(false);
                }}
              >
                <span className="st-menu__name">{a.name}</span>
                <HealthBadge band={a.health.band} score={a.health.score} size="sm" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------- Empty state ----------

function EmptyState({ account, onPick, children }) {
  return (
    <div className="st-empty">
      <span className="st-tile st-tile--accent st-tile--lg" aria-hidden="true">
        <Icon name="sparkle" size={22} />
      </span>
      <h1 className="st-empty__title">How can I help with your accounts today?</h1>
      <p className="st-empty__lead">
        {account
          ? `Ask about ${account.name}, or pick a question below.`
          : 'Ask about any account you own. Every answer cites its source records.'}
      </p>
      {children}
      <ul className="st-suggestions">
        {SUGGESTIONS.map((s) => (
          <li key={s.intent}>
            <button
              type="button"
              className={`st-suggestion st-suggestion--${s.tint}`}
              onClick={() => onPick(s.intent)}
            >
              <span className={`st-tile st-tile--${s.tint} st-tile--sm`} aria-hidden="true">
                <Icon name={s.icon} size={14} />
              </span>
              <span className="st-suggestion__title">{s.title}</span>
              <span className="st-suggestion__text">{s.text}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- Messages ----------

function AssistantMessage({ message, onPickAccount, onIntent, onOpenLink, onCopy, onFeedback }) {
  const [feedback, setFeedback] = useState(null);
  const { answer } = message;
  return (
    <li className="st-msg st-msg--assistant">
      <span className="st-tile st-tile--accent st-tile--sm" aria-hidden="true">
        <Icon name="sparkle" size={14} />
      </span>
      <div className="st-msg__body">
        {message.pending && (
          <div className="st-typing" aria-label="SingTech AI is answering">
            <span />
            <span />
            <span />
          </div>
        )}
        {message.error && (
          <p className="st-msg__error" role="alert">
            {message.error}. Try again.
          </p>
        )}
        {answer && (
          <>
            {answer.blocks.map((block, i) => (
              <Block key={i} block={block} />
            ))}
            {answer.card?.type === 'pick_account' && (
              <div className="st-inline-card">
                <p className="st-inline-card__title">{answer.card.title}</p>
                <ul className="st-choices">
                  {answer.card.options.map((o) => (
                    <li key={o.id}>
                      <button
                        type="button"
                        className="st-choice"
                        onClick={() => onPickAccount(o.id)}
                      >
                        <span className="st-choice__radio" aria-hidden="true" />
                        <span className="st-choice__name">{o.name}</span>
                        <HealthBadge band={o.band} score={o.score} size="sm" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {answer.card?.type === 'next_step' && (
              <div className="st-inline-card st-inline-card--compact">
                <p className="st-inline-card__title">{answer.card.title}</p>
                <div className="st-inline-card__actions">
                  {answer.card.options.map((o) => (
                    <button
                      key={o.label}
                      type="button"
                      className="st-tool-btn"
                      onClick={() => (o.kind === 'link' ? onOpenLink(o.href) : onIntent(o.intent))}
                    >
                      <Icon name={o.kind === 'link' ? 'arrowRight' : 'sparkle'} size={14} />
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {answer.suggestions?.length > 0 && !answer.card && (
              <div className="st-inline-card__actions">
                {answer.suggestions.map((s) => (
                  <button
                    key={s.code}
                    type="button"
                    className="st-tool-btn"
                    onClick={() => onIntent(s.code)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
            <div className="st-msg__actions">
              <button
                type="button"
                className="st-msg__action"
                aria-label="Helpful"
                aria-pressed={feedback === 'up'}
                onClick={() => {
                  setFeedback('up');
                  onFeedback('up');
                }}
              >
                <Icon name="thumbUp" size={15} />
              </button>
              <button
                type="button"
                className="st-msg__action"
                aria-label="Not helpful"
                aria-pressed={feedback === 'down'}
                onClick={() => {
                  setFeedback('down');
                  onFeedback('down');
                }}
              >
                <Icon name="thumbDown" size={15} />
              </button>
              <button
                type="button"
                className="st-msg__action"
                aria-label="Copy answer"
                onClick={onCopy}
              >
                <Icon name="copy" size={15} />
              </button>
              <span className="st-msg__mode">Rules-based preview</span>
            </div>
          </>
        )}
      </div>
    </li>
  );
}

function Block({ block }) {
  if (block.type === 'list') {
    const List = block.ordered ? 'ol' : 'ul';
    return (
      <List className="st-answer-list">
        {block.items.map((item, i) => (
          <li key={i}>
            <span>{item.text}</span> <EvidenceLinks ids={item.evidence_ids} max={3} />
          </li>
        ))}
      </List>
    );
  }
  if (block.type === 'action') return <p className="st-answer-action">{block.text}</p>;
  return <p className="st-answer-text">{block.text}</p>;
}

// ---------- Composer ----------

function Composer({ busy, account, accounts, onSend, onPickAccount, autoFocus = false }) {
  const [text, setText] = useState('');
  const [toolsOpen, setToolsOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const ref = useRef(null);
  const areaRef = useRef(null);

  useEffect(() => {
    if (!toolsOpen && !pickerOpen) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setToolsOpen(false);
        setPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [toolsOpen, pickerOpen]);

  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    area.style.height = 'auto';
    area.style.height = `${Math.min(area.scrollHeight, 160)}px`;
  }, [text]);

  const submit = () => {
    const message = text.trim();
    if (!message || busy) return;
    onSend({ message });
    setText('');
  };

  return (
    <div className="st-composer" ref={ref}>
      <label className="st-visually-hidden" htmlFor="st-composer-input">
        Ask about an account
      </label>
      <textarea
        id="st-composer-input"
        ref={areaRef}
        className="st-composer__input"
        rows={2}
        placeholder={account ? `Ask about ${account.name}...` : 'Ask about an account...'}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        autoFocus={autoFocus}
        maxLength={500}
      />
      <div className="st-composer__row">
        <button
          type="button"
          className="st-icon-btn"
          aria-label="Choose an account"
          aria-expanded={pickerOpen}
          onClick={() => {
            setPickerOpen(!pickerOpen);
            setToolsOpen(false);
          }}
        >
          <Icon name="plus" size={16} />
        </button>
        <button
          type="button"
          className="st-chip"
          aria-expanded={toolsOpen}
          onClick={() => {
            setToolsOpen(!toolsOpen);
            setPickerOpen(false);
          }}
        >
          <Icon name="sliders" size={14} />
          Tools
        </button>
        <span className="st-composer__spacer" />
        <button
          type="button"
          className="st-composer__mic"
          aria-label="Voice input is not available in this preview"
          title="Voice input is not available in this preview"
          disabled
        >
          <Icon name="mic" size={16} />
        </button>
        <button
          type="button"
          className="st-send"
          aria-label="Send"
          disabled={!text.trim() || busy}
          onClick={submit}
        >
          <Icon name="send" size={16} />
        </button>
      </div>
      {toolsOpen && (
        <ul className="st-menu st-composer__menu" role="menu">
          {SUGGESTIONS.map((s) => (
            <li key={s.intent}>
              <button
                type="button"
                role="menuitem"
                className="st-menu__item"
                onClick={() => {
                  setToolsOpen(false);
                  onSend({ intent: s.intent });
                }}
              >
                <span className={`st-tile st-tile--${s.tint} st-tile--xs`} aria-hidden="true">
                  <Icon name={s.icon} size={12} />
                </span>
                {s.title}
              </button>
            </li>
          ))}
        </ul>
      )}
      {pickerOpen && (
        <ul className="st-menu st-composer__menu" role="menu">
          {(accounts ?? []).map((a) => (
            <li key={a.id}>
              <button
                type="button"
                role="menuitem"
                className="st-menu__item st-menu__item--stack"
                onClick={() => {
                  onPickAccount(a.id);
                  setPickerOpen(false);
                }}
              >
                <span className="st-menu__name">{a.name}</span>
                <HealthBadge band={a.health.band} score={a.health.score} size="sm" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
