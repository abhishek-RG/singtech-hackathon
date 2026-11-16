// SingTech AI product site. Structure follows the reference video's section order; the bento stat
// cards and scroll fade-in follow magicuidesign/magicui (MIT): apps/www/registry/magicui/
// bento-grid.tsx and blur-fade.tsx, rebuilt with our CSS and an IntersectionObserver hook.
// Every number on this page is a true capability of what is built, or is labelled as planned.

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import Icon, { Logo } from '../components/Icon.jsx';
import { AccountPreview, BookPreview } from './ProductPreview.jsx';
import '../theme.css';
import '../shell/shell.css';
import '../AccountIntelligence.css';
import './landing.css';

const NAV = [
  { href: '#product', label: 'Product' },
  { href: '#how', label: 'How it works' },
  { href: '#security', label: 'Security' },
  { href: '#faq', label: 'FAQ' },
];

const STATS = [
  { value: '6', label: 'Singtel products mapped in every gap analysis', tone: 'light' },
  { value: '0', label: 'customer records sent to a third-party AI service', tone: 'dark' },
  { value: 'Every', label: 'insight cites the source record it came from', tone: 'accent' },
  { value: '4', label: 'questions route each account to exactly one next action', tone: 'soft' },
];

const FEATURES = [
  {
    title: 'Customer 360',
    text: 'Hierarchy, services, sites, contracts and stakeholders on one page.',
    icon: 'user',
    tint: 'blue',
  },
  {
    title: 'Change detection',
    text: 'Services added or removed, spend trends, new sites and people who left.',
    icon: 'pulse',
    tint: 'orange',
  },
  {
    title: 'Health and why',
    text: 'A 0 to 100 score from rules, with every point linked to its record.',
    icon: 'shield',
    tint: 'green',
  },
  {
    title: 'Gap analysis',
    text: 'Which of the six products each account lacks, matched to a real signal.',
    icon: 'layers',
    tint: 'purple',
  },
  {
    title: 'Next best action',
    text: 'One action per account, with talking points and the person to call.',
    icon: 'target',
    tint: 'accent',
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Connect Salesforce and Excel',
    text: 'One connector interface reads accounts, services, contracts, cases and bills. The demo runs on a simulated connector.',
    tag: 'Simulated today',
  },
  {
    n: '02',
    title: 'Analyse every account',
    text: 'Rules compute tenure, what changed in 180 days, health with reasons, and the products each account is missing.',
  },
  {
    n: '03',
    title: 'Decide the next action',
    text: 'A four-question decision tree ends in one action. Price pressure leads to a value case, never a discount.',
  },
  {
    n: '04',
    title: 'Act in Salesforce',
    text: 'Renewal, upsell and cross-sell opportunities are written back to the account, so outcomes can be tracked.',
    tag: 'Planned for the pilot',
  },
];

const SECURITY = [
  {
    title: 'No external AI calls',
    text: 'Every score and sentence comes from rules on our own server. The Phase 2 assistant runs a local model.',
    icon: 'chip',
    status: 'Live in demo',
  },
  {
    title: 'Personal data masked',
    text: 'Contact emails are stored masked and no phone numbers are kept, in the demo data and in the planned database.',
    icon: 'eyeOff',
    status: 'Live in demo',
  },
  {
    title: 'Role-based access',
    text: 'Admins see every account. Account managers see only the accounts they own.',
    icon: 'users',
    status: 'Live in demo',
  },
  {
    title: 'Audit log',
    text: 'Account views and assistant questions are logged with who asked and when.',
    icon: 'log',
    status: 'Live in demo',
  },
  {
    title: 'Supabase in Singapore',
    text: 'Row-level security on every table, with explicit grants and data held in the Singapore region.',
    icon: 'database',
    status: 'Planned for the pilot',
  },
];

const PILOT = [
  {
    title: 'One account team',
    text: 'Start with a single enterprise account team and its existing customers.',
  },
  {
    title: 'Read-only access',
    text: 'Salesforce access is read-only first. Nothing is written until the team agrees.',
  },
  {
    title: 'Eight weeks, measured',
    text: 'Opportunities created and renewals won, compared with a control team.',
  },
];

const FAQ = [
  {
    q: 'How does it connect to Salesforce?',
    a: 'Through one connector interface. The demo uses a simulated connector shaped like Salesforce Communications Cloud. In a pilot, the same interface reads those objects through the Salesforce REST API, read-only first.',
  },
  {
    q: 'Is customer data sent anywhere?',
    a: 'No. Today every number and sentence is produced by rules on our own server, and no AI service is called. The Phase 2 assistant runs a local model, with personal data masked before the model sees it.',
  },
  {
    q: 'What data does it need?',
    a: 'Accounts and their hierarchy, installed services, contracts, cases, activities, contacts with their roles, and monthly bills, all read-only. Bills are used as signals only; SingTech AI never changes billing.',
  },
  {
    q: 'Can it work in other markets?',
    a: 'Yes. Markets, currencies and industries are configuration. The simulated data covers ten markets with local currency stored next to SGD, and rules can differ by industry.',
  },
];

/** Adds .is-visible when an element scrolls into view (once). */
function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    const targets = root.querySelectorAll('.st-reveal');
    if (!('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('is-visible'));
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  return ref;
}

export default function Landing() {
  const ref = useReveal();
  useEffect(() => {
    const previous = document.title;
    document.title = 'SingTech AI | Account intelligence for Singtel Business';
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <div className="st-root st-landing" ref={ref}>
      <a href="#main" className="st-skip">
        Skip to content
      </a>
      <header className="st-lnav">
        <Link to="/" className="st-lnav__brand" aria-label="SingTech AI home">
          <Logo size={30} />
        </Link>
        <nav className="st-lnav__links" aria-label="Product site">
          {NAV.map((n) => (
            <a key={n.href} href={n.href}>
              {n.label}
            </a>
          ))}
        </nav>
        <div className="st-lnav__actions">
          <Link to="/sign-in" className="st-lnav__signin">
            Sign in
          </Link>
          <Link to="/accounts" className="st-cta st-cta--sm">
            Open dashboard
          </Link>
        </div>
      </header>

      <main id="main">
        <Hero />
        <ValueStrip />
        <Carousel />
        <Steps />
        <Showcase />
        <Security />
        <Pilot />
        <Faq />
      </main>
      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section className="st-hero" aria-labelledby="st-hero-title">
      <svg
        className="st-hero__waves"
        viewBox="0 0 1440 720"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <filter id="st-soft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="42" />
          </filter>
        </defs>
        <g filter="url(#st-soft)">
          <ellipse
            className="st-wave st-wave--1"
            cx="260"
            cy="170"
            rx="260"
            ry="150"
            style={{ fill: 'var(--st-wave-a)' }}
          />
          <ellipse
            className="st-wave st-wave--2"
            cx="1180"
            cy="150"
            rx="280"
            ry="170"
            style={{ fill: 'var(--st-wave-b)' }}
          />
          <path
            className="st-wave st-wave--3"
            d="M0 470 C 240 380 480 560 720 470 S 1200 360 1440 460 V720 H0Z"
            style={{ fill: 'var(--st-wave-a)' }}
          />
          <path
            className="st-wave st-wave--4"
            d="M0 560 C 320 470 620 650 940 545 S 1310 480 1440 560 V720 H0Z"
            style={{ fill: 'var(--st-wave-c)' }}
          />
        </g>
      </svg>
      <div className="st-hero__inner">
        <p className="st-hero__pill st-enter">
          <span className="st-hero__pill-dot" aria-hidden="true" />
          Built for Singtel enterprise account teams
        </p>
        <h1 id="st-hero-title" className="st-hero__title st-enter" style={{ '--delay': '50ms' }}>
          Know every account
          <br />
          <em>
            before it <span className="st-accent-word">changes</span>
          </em>
        </h1>
        <p className="st-hero__lead st-enter" style={{ '--delay': '100ms' }}>
          SingTech AI reads your CRM and billing records, explains each customer&rsquo;s health, and
          recommends the next action, with every insight tied to its source.
        </p>
        <div className="st-enter" style={{ '--delay': '150ms' }}>
          <a href="#how" className="st-cta">
            <span className="st-cta__play" aria-hidden="true">
              <Icon name="play" size={12} />
            </span>
            See how it works
          </a>
        </div>
      </div>
      <div className="st-hero__preview st-enter" style={{ '--delay': '200ms' }}>
        <BookPreview />
      </div>
    </section>
  );
}

function ValueStrip() {
  return (
    <section id="product" className="st-section st-value" aria-labelledby="st-value-title">
      <h2 id="st-value-title" className="st-value__statement st-reveal">
        Account managers spend hours joining Salesforce, Excel and email before every call.{' '}
        <span>
          SingTech AI turns that into one page per customer, with the decision already framed.
        </span>
      </h2>
      <ul className="st-bento">
        {STATS.map((s, i) => (
          <li
            key={s.label}
            className={`st-stat st-stat--${s.tone} st-reveal`}
            style={{ '--delay': `${i * 50}ms` }}
          >
            <span className="st-stat__value">{s.value}</span>
            <span className="st-stat__label">{s.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Carousel() {
  const trackRef = useRef(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const update = () => {
    const el = trackRef.current;
    if (!el) return;
    setEdges({
      start: el.scrollLeft <= 4,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
    });
  };

  useEffect(() => {
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const scrollBy = (direction) => {
    const el = trackRef.current;
    const card = el?.querySelector('.st-feature');
    if (!el || !card) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({
      left: direction * (card.offsetWidth + 16),
      behavior: reduce ? 'auto' : 'smooth',
    });
  };

  return (
    <section className="st-section" aria-labelledby="st-features-title">
      <div className="st-section__head st-reveal">
        <h2 id="st-features-title" className="st-h">
          Everything an account team needs <em>in one view</em>
        </h2>
        <div className="st-carousel__buttons">
          <button
            type="button"
            className="st-round-btn"
            aria-label="Previous"
            disabled={edges.start}
            onClick={() => scrollBy(-1)}
          >
            <Icon name="arrowLeft" />
          </button>
          <button
            type="button"
            className="st-round-btn"
            aria-label="Next"
            disabled={edges.end}
            onClick={() => scrollBy(1)}
          >
            <Icon name="arrowRight" />
          </button>
        </div>
      </div>
      <ul
        className="st-carousel st-reveal"
        ref={trackRef}
        onScroll={update}
        aria-label="Capabilities"
      >
        {FEATURES.map((f) => (
          <li key={f.title} className={`st-feature st-feature--${f.tint}`}>
            <span
              className={`st-tile st-tile--${f.tint === 'accent' ? 'accent' : f.tint}`}
              aria-hidden="true"
            >
              <Icon name={f.icon} size={18} />
            </span>
            <h3 className="st-feature__title">{f.title}</h3>
            <p className="st-feature__text">{f.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Steps() {
  return (
    <section id="how" className="st-section" aria-labelledby="st-steps-title">
      <h2 id="st-steps-title" className="st-h st-reveal">
        Four steps to a <em>healthier book</em>
      </h2>
      <ol className="st-steps">
        {STEPS.map((s, i) => (
          <li key={s.n} className="st-step st-reveal" style={{ '--delay': `${i * 50}ms` }}>
            <span className="st-step__n">{s.n}</span>
            <h3 className="st-step__title">{s.title}</h3>
            <p className="st-step__text">{s.text}</p>
            {s.tag && <span className="st-pill st-pill--neutral">{s.tag}</span>}
          </li>
        ))}
      </ol>
    </section>
  );
}

function Showcase() {
  return (
    <section className="st-section st-showcase" aria-labelledby="st-showcase-title">
      <h2 id="st-showcase-title" className="st-h st-h--center st-reveal">
        One command centre for <em>every existing customer</em>
      </h2>
      <p className="st-section__lead st-reveal">
        The account page answers six questions: who they are, what they have and since when, what
        changed, whether they are at risk, what they are missing, and what to do next.
      </p>
      <div className="st-showcase__frame st-reveal">
        <AccountPreview />
      </div>
    </section>
  );
}

function Security() {
  return (
    <section id="security" className="st-section" aria-labelledby="st-security-title">
      <h2 id="st-security-title" className="st-h st-reveal">
        Private by design, <em>from day one</em>
      </h2>
      <ul className="st-security">
        {SECURITY.map((s, i) => (
          <li key={s.title} className="st-sec-card st-reveal" style={{ '--delay': `${i * 50}ms` }}>
            <span className="st-tile st-tile--blue" aria-hidden="true">
              <Icon name={s.icon} size={18} />
            </span>
            <h3 className="st-sec-card__title">{s.title}</h3>
            <p className="st-sec-card__text">{s.text}</p>
            <span
              className={`st-pill ${s.status.startsWith('Live') ? 'st-pill--live' : 'st-pill--neutral'}`}
            >
              {s.status}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Pilot() {
  return (
    <section className="st-section" aria-labelledby="st-pilot-title">
      <h2 id="st-pilot-title" className="st-h st-reveal">
        A pilot you can <em>measure</em>
      </h2>
      <ol className="st-pilot">
        {PILOT.map((p, i) => (
          <li
            key={p.title}
            className="st-pilot__step st-reveal"
            style={{ '--delay': `${i * 90}ms` }}
          >
            <span className="st-pilot__n">{i + 1}</span>
            <span>
              <strong>{p.title}</strong>
              <span className="st-pilot__text">{p.text}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Faq() {
  return (
    <section id="faq" className="st-faq" aria-labelledby="st-faq-title">
      <div className="st-faq__inner">
        <h2 id="st-faq-title" className="st-h st-reveal">
          Questions, <em>answered</em>
        </h2>
        <div className="st-faq__list">
          {FAQ.map((f, i) => (
            <details
              key={f.q}
              className="st-faq__item st-reveal"
              style={{ '--delay': `${i * 60}ms` }}
            >
              <summary>
                {f.q}
                <span className="st-faq__icon" aria-hidden="true">
                  <Icon name="plus" size={16} />
                </span>
              </summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="st-footer">
      <div className="st-footer__inner">
        <Logo size={26} />
        <nav className="st-footer__links" aria-label="Footer">
          {NAV.map((n) => (
            <a key={n.href} href={n.href}>
              {n.label}
            </a>
          ))}
          <Link to="/sign-in">Sign in</Link>
        </nav>
        <p className="st-footer__note">Simulated data for demo purposes. © 2026 SingTech AI.</p>
      </div>
    </footer>
  );
}
