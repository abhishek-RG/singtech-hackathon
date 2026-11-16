import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useOutletContext } from 'react-router';
import { api } from '../lib/api.js';
import './Workspace.css';

const CHANNELS = {
  Email: { mark: '✉', label: 'Email', className: 'email' },
  'Face-to-face': { mark: '◉', label: 'Face-to-face meeting', className: 'in-person' },
  'Online meeting': { mark: '▣', label: 'Online meeting', className: 'online' },
  'Phone call': { mark: '☎', label: 'Phone call', className: 'phone' },
  WhatsApp: { mark: 'W', label: 'WhatsApp', className: 'whatsapp' },
  Purchase: { mark: '↗', label: 'Service purchased', className: 'purchase' },
  'Account review': { mark: '▤', label: 'Account review', className: 'review' },
  Screenshot: { mark: '▧', label: 'Screenshot', className: 'email' },
  Microphone: { mark: '◉', label: 'Microphone recording', className: 'phone' },
};

async function compressScreenshot(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
  if (!blob || blob.size > 4 * 1024 * 1024)
    throw new Error('Screenshot is too large after compression.');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read this image.'));
    reader.readAsDataURL(blob);
  });
}

function formatDate(value, options = {}) {
  return new Intl.DateTimeFormat('en-SG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  }).format(new Date(`${value}T00:00:00`));
}

function ChannelMark({ channel }) {
  const item = CHANNELS[channel] || { mark: '•', label: channel, className: 'other' };
  return (
    <span
      className={`event-mark event-mark--${item.className}`}
      title={item.label}
      aria-label={item.label}
    >
      {item.mark}
    </span>
  );
}

function TimelineView({ workspace, accountId, query, setQuery, onInteractionAdded }) {
  const [showDocuments, setShowDocuments] = useState(false);
  const [expandedEvent, setExpandedEvent] = useState(null);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [showImageForm, setShowImageForm] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [savingManual, setSavingManual] = useState(false);
  const [imageError, setImageError] = useState('');
  const [manualError, setManualError] = useState('');
  const [manualForm, setManualForm] = useState({
    title: '',
    date: new Date().toISOString().slice(0, 10),
    sourceType: 'Meeting notes',
    participants: '',
    content: '',
  });
  const [imageForm, setImageForm] = useState({
    title: '',
    sender: '',
    date: new Date().toISOString().slice(0, 10),
    imageData: '',
  });
  const [emailForm, setEmailForm] = useState({
    subject: '',
    sender: '',
    date: new Date().toISOString().slice(0, 10),
    summary: '',
    content: '',
  });
  const needle = query.trim().toLowerCase();
  const interactions = workspace.interactions.filter((item) =>
    [
      item.title,
      item.description,
      item.details?.summary,
      item.details?.content,
      item.channel,
      item.sourceType,
      ...item.tags,
    ]
      .join(' ')
      .toLowerCase()
      .includes(needle),
  );
  const documents = workspace.documents.filter((item) =>
    [item.title, item.type, item.source, item.content, ...item.tags]
      .join(' ')
      .toLowerCase()
      .includes(needle),
  );

  async function saveEmail(event) {
    event.preventDefault();
    setEmailError('');
    setSavingEmail(true);
    try {
      const response = await api.post(
        `/accounts/${encodeURIComponent(accountId)}/interactions/email`,
        emailForm,
      );
      onInteractionAdded(response.data.interaction);
      setEmailForm({
        subject: '',
        sender: '',
        date: new Date().toISOString().slice(0, 10),
        summary: '',
        content: '',
      });
      setShowEmailForm(false);
      setShowDocuments(false);
    } catch (err) {
      setEmailError(err.message || 'Could not add this email.');
    } finally {
      setSavingEmail(false);
    }
  }

  async function saveScreenshot(event) {
    event.preventDefault();
    setImageError('');
    setSavingImage(true);
    try {
      const response = await api.post(
        `/accounts/${encodeURIComponent(accountId)}/interactions/screenshot`,
        imageForm,
      );
      onInteractionAdded(response.data.interaction);
      setImageForm({
        title: '',
        sender: '',
        date: new Date().toISOString().slice(0, 10),
        imageData: '',
      });
      setShowImageForm(false);
      setShowDocuments(false);
    } catch (err) {
      setImageError(err.message || 'Could not analyze this screenshot.');
    } finally {
      setSavingImage(false);
    }
  }

  async function saveManualSource(event) {
    event.preventDefault();
    setManualError('');
    setSavingManual(true);
    try {
      const response = await api.post(
        `/accounts/${encodeURIComponent(accountId)}/interactions/manual`,
        manualForm,
      );
      onInteractionAdded(response.data.interaction);
      setManualForm({
        title: '',
        date: new Date().toISOString().slice(0, 10),
        sourceType: 'Meeting notes',
        participants: '',
        content: '',
      });
      setShowManualForm(false);
      setShowDocuments(false);
    } catch (err) {
      setManualError(err.message || 'Could not save this source.');
    } finally {
      setSavingManual(false);
    }
  }

  return (
    <>
      <div className="content-heading">
        <div>
          <p className="section-overline">ACCOUNT HISTORY</p>
          <h2>Timeline & documents</h2>
          <p>Every interaction, purchase, and source document in one customer record.</p>
        </div>
        <div className="history-actions">
          <label className="history-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder="Search this customer"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search this customer’s timeline and documents"
            />
          </label>
          <button
            type="button"
            className="add-email-button"
            onClick={() => {
              setShowEmailForm((visible) => !visible);
              setShowImageForm(false);
              setShowManualForm(false);
            }}
          >
            {showEmailForm ? 'Cancel' : 'Add email'}
          </button>
          <button
            type="button"
            className="add-email-button"
            onClick={() => {
              setShowImageForm((visible) => !visible);
              setShowEmailForm(false);
              setShowManualForm(false);
            }}
          >
            {showImageForm ? 'Cancel' : 'Upload screenshot'}
          </button>
          <button
            type="button"
            className="add-email-button"
            onClick={() => {
              setShowManualForm((visible) => !visible);
              setShowEmailForm(false);
              setShowImageForm(false);
            }}
          >
            {showManualForm ? 'Cancel' : 'Paste notes'}
          </button>
        </div>
      </div>

      {showEmailForm && (
        <form className="email-entry" onSubmit={saveEmail}>
          <div className="email-entry__heading">
            <div>
              <strong>Add an email to this account</strong>
              <span>Paste the conversation so it stays with the customer history.</span>
            </div>
            <button
              type="button"
              className="email-entry__close"
              onClick={() => setShowEmailForm(false)}
              aria-label="Close email form"
            >
              ×
            </button>
          </div>
          <div className="email-entry__fields">
            <label>
              Subject
              <input
                maxLength="180"
                value={emailForm.subject}
                onChange={(event) => setEmailForm({ ...emailForm, subject: event.target.value })}
                required
              />
            </label>
            <label>
              From
              <input
                maxLength="180"
                value={emailForm.sender}
                onChange={(event) => setEmailForm({ ...emailForm, sender: event.target.value })}
                required
              />
            </label>
            <label>
              Date
              <input
                type="date"
                value={emailForm.date}
                onChange={(event) => setEmailForm({ ...emailForm, date: event.target.value })}
                required
              />
            </label>
            <label className="email-entry__summary">
              Summary or note <span>Optional</span>
              <input
                maxLength="1000"
                value={emailForm.summary}
                onChange={(event) => setEmailForm({ ...emailForm, summary: event.target.value })}
              />
            </label>
            <label className="email-entry__body">
              Email conversation
              <textarea
                maxLength="50000"
                rows="7"
                value={emailForm.content}
                onChange={(event) => setEmailForm({ ...emailForm, content: event.target.value })}
                required
              />
            </label>
          </div>
          {emailError && (
            <p className="email-entry__error" role="alert">
              {emailError}
            </p>
          )}
          <div className="email-entry__footer">
            <span>The conversation is stored locally in this prototype.</span>
            <button type="submit" className="add-email-button" disabled={savingEmail}>
              {savingEmail ? 'Saving…' : 'Save to timeline'}
            </button>
          </div>
        </form>
      )}

      {showImageForm && (
        <form className="email-entry" onSubmit={saveScreenshot}>
          <div className="email-entry__heading">
            <div>
              <strong>Add a screenshot to this account</strong>
              <span>AI will extract visible details and save them with the original image.</span>
            </div>
            <button
              type="button"
              className="email-entry__close"
              onClick={() => setShowImageForm(false)}
              aria-label="Close screenshot form"
            >
              ×
            </button>
          </div>
          <div className="email-entry__fields">
            <label>
              Screenshot title
              <input
                maxLength="180"
                value={imageForm.title}
                onChange={(event) => setImageForm({ ...imageForm, title: event.target.value })}
                required
              />
            </label>
            <label>
              Supplied by
              <input
                maxLength="180"
                value={imageForm.sender}
                onChange={(event) => setImageForm({ ...imageForm, sender: event.target.value })}
                required
              />
            </label>
            <label>
              Date
              <input
                type="date"
                value={imageForm.date}
                onChange={(event) => setImageForm({ ...imageForm, date: event.target.value })}
                required
              />
            </label>
            <label className="email-entry__body">
              Screenshot
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                required
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  try {
                    const imageData = await compressScreenshot(file);
                    setImageError('');
                    setImageForm((current) => ({ ...current, imageData }));
                  } catch (err) {
                    setImageError(err.message);
                  }
                }}
              />
            </label>
          </div>
          {imageForm.imageData && (
            <img
              className="screenshot-preview"
              src={imageForm.imageData}
              alt="Screenshot preview"
            />
          )}
          {imageError && (
            <p className="email-entry__error" role="alert">
              {imageError}
            </p>
          )}
          <div className="email-entry__footer">
            <span>The image and extracted notes are saved in this prototype.</span>
            <button
              type="submit"
              className="add-email-button"
              disabled={savingImage || !imageForm.imageData}
            >
              {savingImage ? 'Reading screenshot…' : 'Analyze and save'}
            </button>
          </div>
        </form>
      )}

      {showManualForm && (
        <form className="email-entry" onSubmit={saveManualSource}>
          <div className="email-entry__heading">
            <div>
              <strong>Paste a customer source</strong>
              <span>Manually add meeting notes, call notes, messages, or an account document.</span>
            </div>
          </div>
          <div className="email-entry__fields">
            <label>
              Title
              <input
                maxLength="180"
                value={manualForm.title}
                onChange={(event) => setManualForm({ ...manualForm, title: event.target.value })}
                required
              />
            </label>
            <label>
              Source type
              <select
                value={manualForm.sourceType}
                onChange={(event) =>
                  setManualForm({ ...manualForm, sourceType: event.target.value })
                }
              >
                {[
                  'Meeting notes',
                  'Call notes',
                  'Message thread',
                  'Account note',
                  'Other document',
                ].map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </label>
            <label>
              Date
              <input
                type="date"
                value={manualForm.date}
                onChange={(event) => setManualForm({ ...manualForm, date: event.target.value })}
                required
              />
            </label>
            <label className="email-entry__summary">
              Participants <span>Optional</span>
              <input
                maxLength="180"
                value={manualForm.participants}
                onChange={(event) =>
                  setManualForm({ ...manualForm, participants: event.target.value })
                }
              />
            </label>
            <label className="email-entry__body">
              Source text
              <textarea
                maxLength="50000"
                rows="7"
                value={manualForm.content}
                onChange={(event) => setManualForm({ ...manualForm, content: event.target.value })}
                required
              />
            </label>
          </div>
          {manualError && (
            <p className="email-entry__error" role="alert">
              {manualError}
            </p>
          )}
          <div className="email-entry__footer">
            <span>
              This source is manually entered and will be added to the timeline and RAG search.
            </span>
            <button type="submit" className="add-email-button" disabled={savingManual}>
              {savingManual ? 'Saving…' : 'Save to timeline'}
            </button>
          </div>
        </form>
      )}

      <div className="view-switch" role="tablist" aria-label="Customer history view">
        <button
          type="button"
          role="tab"
          aria-selected={!showDocuments}
          className={!showDocuments ? 'is-active' : ''}
          onClick={() => setShowDocuments(false)}
        >
          Interactions <span>{interactions.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={showDocuments}
          className={showDocuments ? 'is-active' : ''}
          onClick={() => setShowDocuments(true)}
        >
          Documents <span>{documents.length}</span>
        </button>
      </div>

      {showDocuments ? (
        <div className="document-list">
          {documents.map((document) => (
            <article className="document-row" key={document.id}>
              <div className="document-icon" aria-hidden="true">
                ▤
              </div>
              <div className="document-copy">
                <span className="document-meta">
                  {document.type} · {formatDate(document.date)}
                </span>
                <h3>{document.title}</h3>
                <p>{document.content}</p>
                <span className="source-tag">Source: {document.source}</span>
              </div>
            </article>
          ))}
          {documents.length === 0 && <p className="empty-state">No documents match this search.</p>}
        </div>
      ) : (
        <div className="timeline-list">
          {interactions.map((event) => (
            <article className="timeline-event" key={event.id}>
              <time className="event-date" dateTime={event.date}>
                {formatDate(event.date)}
              </time>
              <div className="event-track">
                <ChannelMark channel={event.channel} />
              </div>
              <div className="event-card">
                <div className="event-card__meta">
                  <span>{CHANNELS[event.channel]?.label || event.channel}</span>
                  <span>{event.sourceType}</span>
                </div>
                <h3>{event.title}</h3>
                <p>{event.details?.summary || event.description}</p>
                <div className="event-card__bottom">
                  {event.opportunityId && (
                    <span className="event-opportunity">
                      {workspace.account.opportunities.find(
                        (item) => item.id === event.opportunityId,
                      )?.name || 'Sales opportunity'}
                    </span>
                  )}
                  <div className="event-tags">
                    {event.tags.slice(0, 2).map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  className="event-source-toggle"
                  aria-expanded={expandedEvent === event.id}
                  onClick={() =>
                    setExpandedEvent((current) => (current === event.id ? null : event.id))
                  }
                >
                  {expandedEvent === event.id
                    ? 'Hide source'
                    : `Open ${event.sourceType.toLowerCase()}`}
                  <span aria-hidden="true">{expandedEvent === event.id ? '−' : '＋'}</span>
                </button>
                {expandedEvent === event.id && (
                  <div className="event-source-detail">
                    <div>
                      <strong>Participants</strong>
                      <span>{event.details?.participants || 'Not recorded'}</span>
                    </div>
                    <div>
                      <strong>Summary</strong>
                      <span>{event.details?.summary || event.description}</span>
                    </div>
                    <div className="source-document">
                      <strong>Original source</strong>
                      {event.details?.imagePath && (
                        <img
                          className="screenshot-preview"
                          src={`/api/accounts/${encodeURIComponent(accountId)}/interactions/${encodeURIComponent(event.id)}/image`}
                          alt={`Original screenshot: ${event.title}`}
                        />
                      )}
                      <pre>{event.details?.content || event.description}</pre>
                    </div>
                  </div>
                )}
              </div>
            </article>
          ))}
          {interactions.length === 0 && (
            <p className="empty-state">No interactions match this search.</p>
          )}
        </div>
      )}
    </>
  );
}

function IntelligenceView({ workspace, accountId, onInteractionAdded }) {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [micError, setMicError] = useState('');
  const [savingTranscript, setSavingTranscript] = useState(false);
  const recognitionRef = useRef(null);
  const transcriptRef = useRef('');
  const suggestionTimerRef = useRef(null);

  useEffect(
    () => () => {
      window.clearTimeout(suggestionTimerRef.current);
      recognitionRef.current?.stop();
    },
    [],
  );

  function startMicrophone() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setMicError('Live browser transcription is unavailable here. Try Chrome on desktop.');
      return;
    }
    setMicError('');
    transcriptRef.current = '';
    setTranscript('');
    setInterimTranscript('');
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-SG';
    recognition.onresult = (event) => {
      let interim = '';
      let finalText = transcriptRef.current;
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const text = event.results[index][0].transcript.trim();
        if (event.results[index].isFinal) finalText = `${finalText} ${text}`.trim();
        else interim += `${text} `;
      }
      transcriptRef.current = finalText;
      setTranscript(finalText);
      setInterimTranscript(interim.trim());
      if (finalText.length > 15) {
        window.clearTimeout(suggestionTimerRef.current);
        suggestionTimerRef.current = window.setTimeout(async () => {
          try {
            const body = await api.post(`/accounts/${encodeURIComponent(accountId)}/ask`, {
              query: finalText.slice(-900),
            });
            setResult(body.data);
          } catch (err) {
            setMicError(err.message || 'Could not get a live suggestion.');
          }
        }, 1400);
      }
    };
    recognition.onerror = (event) => {
      if (event.error !== 'no-speech')
        setMicError(`Microphone transcription error: ${event.error}`);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  function stopMicrophone() {
    window.clearTimeout(suggestionTimerRef.current);
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
    setInterimTranscript('');
  }

  async function saveTranscript() {
    if (!transcriptRef.current.trim()) return;
    setSavingTranscript(true);
    setMicError('');
    try {
      const body = await api.post(
        `/accounts/${encodeURIComponent(accountId)}/interactions/transcript`,
        { transcript: transcriptRef.current, date: new Date().toISOString().slice(0, 10) },
      );
      onInteractionAdded(body.data.interaction);
      setTranscript('');
      transcriptRef.current = '';
    } catch (err) {
      setMicError(err.message || 'Could not save this transcript.');
    } finally {
      setSavingTranscript(false);
    }
  }

  async function askQuestion(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const response = await api.post(`/accounts/${encodeURIComponent(accountId)}/ask`, {
        query: question,
      });
      setResult(response.data);
    } catch (err) {
      setError(err.message || 'Could not search this account.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="content-heading">
        <div>
          <p className="section-overline">ACCOUNT INTELLIGENCE</p>
          <h2>Ask this account</h2>
          <p>Search customer history and Singtel material for a grounded answer.</p>
        </div>
      </div>
      <section className="mic-assist">
        <div className="mic-assist__heading">
          <div>
            <strong>Live microphone assist</strong>
            <span>Speak through your computer microphone to see transcript-based suggestions.</span>
          </div>
          <button
            type="button"
            className="add-email-button"
            onClick={listening ? stopMicrophone : startMicrophone}
          >
            {listening ? 'Stop listening' : 'Start microphone'}
          </button>
        </div>
        <p className="mic-assist__notice">
          Uses browser speech recognition, which may process audio through the browser provider.
          Demo with non-sensitive audio.
        </p>
        {(transcript || interimTranscript) && (
          <div className="mic-assist__transcript" aria-live="polite">
            {transcript} <span>{interimTranscript}</span>
          </div>
        )}
        {transcript && !listening && (
          <button
            type="button"
            className="text-action"
            onClick={saveTranscript}
            disabled={savingTranscript}
          >
            {savingTranscript ? 'Saving transcript…' : 'Save transcript to timeline'}
          </button>
        )}
        {micError && (
          <p className="email-entry__error" role="alert">
            {micError}
          </p>
        )}
      </section>
      <form className="rag-query" onSubmit={askQuestion}>
        <label htmlFor="account-question">Question or sales situation</label>
        <div className="rag-query__row">
          <input
            id="account-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="e.g. What requirements has the customer raised?"
            maxLength={1000}
            required
          />
          <button type="submit" className="add-email-button" disabled={loading}>
            {loading ? 'Searching…' : 'Ask'}
          </button>
        </div>
        <p>
          Answers use this account’s interactions and the available Singtel service information.
        </p>
      </form>

      {error && (
        <p className="rag-error" role="alert">
          {error}
        </p>
      )}
      {result && (
        <section className="rag-result" aria-live="polite">
          <div className="rag-result__heading">
            <span>
              {result.responseType === 'greeting'
                ? 'Hello'
                : result.generated
                  ? 'Answer'
                  : 'Retrieved context'}
            </span>
            <small>
              {result.retrievalMode === 'not needed'
                ? 'No search needed'
                : result.retrievalMode === 'semantic'
                  ? 'Semantic search'
                  : 'Keyword search'}
            </small>
          </div>
          <p className="rag-result__answer">{result.answer}</p>
          {result.responseType !== 'greeting' && (
            <div className="rag-sources">
              <h3>Sources</h3>
              {result.sources.length ? (
                result.sources.map((source) => (
                  <details className="rag-source" key={`${source.sourceId}-${source.citation}`}>
                    <summary>
                      <span className="rag-source__citation">[{source.citation}]</span>
                      <span>{source.title}</span>
                      <small>
                        {source.type} · {formatDate(source.date)}
                      </small>
                    </summary>
                    <p>{source.text}</p>
                  </details>
                ))
              ) : (
                <p className="rag-no-sources">No matching records found in this account.</p>
              )}
            </div>
          )}
        </section>
      )}

      <section className="rag-account-scope">
        <h3>Searching {workspace.account.name}</h3>
        <p>
          {workspace.interactions.length} interactions and {workspace.documents.length} documents
          are available in this account’s current history.
        </p>
      </section>
    </>
  );
}

export default function Workspace() {
  const { user, authLoading } = useOutletContext();
  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState('');
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeView, setActiveView] = useState('timeline');
  const [query, setQuery] = useState('');
  const [showOrganizationForm, setShowOrganizationForm] = useState(false);
  const [savingOrganization, setSavingOrganization] = useState(false);
  const [organizationError, setOrganizationError] = useState('');
  const [organizationForm, setOrganizationForm] = useState({
    name: '',
    industry: '',
    location: 'Singapore',
    summary: '',
  });

  useEffect(() => {
    if (!user) return undefined;
    const controller = new AbortController();
    api
      .get('/accounts', { signal: controller.signal })
      .then((body) => {
        setAccounts(body.data.accounts);
        setAccountId((current) => current || body.data.accounts[0]?.id || '');
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [user]);

  useEffect(() => {
    if (!user || !accountId) return undefined;
    const controller = new AbortController();
    setLoading(true);
    setWorkspace(null);
    api
      .get(`/accounts/${encodeURIComponent(accountId)}/workspace`, { signal: controller.signal })
      .then((body) => setWorkspace(body.data))
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [accountId, user]);

  useEffect(() => setQuery(''), [accountId, activeView]);

  if (authLoading) return <div className="workspace-loading">Opening your workspace…</div>;
  if (!user) return <Navigate to="/login" replace />;

  const selectedAccount = accounts.find((account) => account.id === accountId);

  function handleInteractionAdded(interaction) {
    setWorkspace((current) => ({
      ...current,
      interactions: [...current.interactions, interaction].sort((left, right) =>
        left.date.localeCompare(right.date),
      ),
      documents: [
        ...current.documents,
        {
          id: interaction.id,
          title: interaction.title,
          type: interaction.sourceType,
          date: interaction.date,
          source: interaction.sourceType,
          tags: interaction.tags,
          content: interaction.details.content,
        },
      ],
    }));
  }

  async function createOrganization(event) {
    event.preventDefault();
    setOrganizationError('');
    setSavingOrganization(true);
    try {
      const response = await api.post('/accounts', organizationForm);
      const account = response.data.account;
      setAccounts((current) => [...current, account]);
      setAccountId(account.id);
      setActiveView('timeline');
      setOrganizationForm({ name: '', industry: '', location: 'Singapore', summary: '' });
      setShowOrganizationForm(false);
    } catch (err) {
      setOrganizationError(err.message || 'Could not add this organization.');
    } finally {
      setSavingOrganization(false);
    }
  }

  return (
    <div className="workspace-page">
      <header className="workspace-topline">
        <div>
          <p className="workspace-eyebrow">SINGTEL ENTERPRISE</p>
          <h1>Customer workspace</h1>
        </div>
      </header>

      {error && <div className="workspace-state workspace-state--error">{error}</div>}
      {loading && !workspace && <div className="workspace-state">Loading customer history…</div>}

      {workspace && selectedAccount && (
        <>
          <div className="workspace-layout">
            <aside className="workspace-sidebar" aria-label="Customer workspace sections">
              <label className="sidebar-enterprise">
                <span className="sidebar-label">ENTERPRISE</span>
                <select
                  value={accountId}
                  onChange={(event) => setAccountId(event.target.value)}
                  aria-label="Select enterprise customer"
                >
                  {accounts.map((account) => (
                    <option value={account.id} key={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
                <small>
                  {workspace.account.industry} · {workspace.account.location}
                </small>
              </label>
              <button
                type="button"
                className="sidebar-add-org"
                onClick={() => setShowOrganizationForm((open) => !open)}
              >
                {showOrganizationForm ? 'Cancel' : '+ Add enterprise'}
              </button>
              {showOrganizationForm && (
                <form className="organization-form" onSubmit={createOrganization}>
                  <label>
                    Organization name
                    <input
                      maxLength="180"
                      value={organizationForm.name}
                      onChange={(event) =>
                        setOrganizationForm({ ...organizationForm, name: event.target.value })
                      }
                      required
                    />
                  </label>
                  <label>
                    Industry
                    <input
                      maxLength="120"
                      value={organizationForm.industry}
                      onChange={(event) =>
                        setOrganizationForm({ ...organizationForm, industry: event.target.value })
                      }
                      required
                    />
                  </label>
                  <label>
                    Location
                    <input
                      maxLength="120"
                      value={organizationForm.location}
                      onChange={(event) =>
                        setOrganizationForm({ ...organizationForm, location: event.target.value })
                      }
                      required
                    />
                  </label>
                  <label>
                    Account context <span>Optional</span>
                    <textarea
                      maxLength="1000"
                      rows="3"
                      value={organizationForm.summary}
                      onChange={(event) =>
                        setOrganizationForm({ ...organizationForm, summary: event.target.value })
                      }
                    />
                  </label>
                  {organizationError && <small role="alert">{organizationError}</small>}
                  <button type="submit" className="add-email-button" disabled={savingOrganization}>
                    {savingOrganization ? 'Creating…' : 'Create organization'}
                  </button>
                </form>
              )}
              <p className="sidebar-label sidebar-label--section">CUSTOMER RECORD</p>
              <button
                type="button"
                className={`sidebar-link ${activeView === 'timeline' ? 'is-active' : ''}`}
                onClick={() => setActiveView('timeline')}
              >
                <span className="sidebar-link__icon">◷</span> Timeline
              </button>
              <button
                type="button"
                className={`sidebar-link ${activeView === 'intelligence' ? 'is-active' : ''}`}
                onClick={() => setActiveView('intelligence')}
              >
                <span className="sidebar-link__icon">✳</span> Intelligence
                <span className="sidebar-link__count">{workspace.intelligence.length}</span>
              </button>
              <div className="sidebar-services">
                <p className="sidebar-label">CURRENT SERVICES</p>
                {workspace.account.services.map((service) => (
                  <span key={service.id}>{service.name}</span>
                ))}
              </div>
            </aside>

            <main className="workspace-content">
              {activeView === 'timeline' ? (
                <TimelineView
                  workspace={workspace}
                  accountId={accountId}
                  query={query}
                  setQuery={setQuery}
                  onInteractionAdded={handleInteractionAdded}
                />
              ) : (
                <IntelligenceView
                  workspace={workspace}
                  accountId={accountId}
                  onInteractionAdded={handleInteractionAdded}
                />
              )}
            </main>
          </div>
        </>
      )}
    </div>
  );
}
